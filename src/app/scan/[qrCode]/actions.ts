"use server";

// src/app/scan/[qrCode]/actions.ts

import { prisma } from "@/lib/db/prisma";
import { headers, cookies } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { deviceFingerprint } from "@/lib/device-fingerprint";
import { getLicenseState, expireStaleLicenses } from "@/lib/license/guard";

type ActionResult = {
  success: boolean;
  error?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
};

/**
 * Calculate distance between two GPS coordinates in meters (Haversine formula).
 */
function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Search students by name/NISN/NIS within the QR session's class.
 */
export async function searchStudents(
  qrCode: string,
  query: string
): Promise<ActionResult> {
  try {
    if (!query || query.trim().length < 2) {
      return { success: true, data: [] };
    }

    // Rate limit: 60 search calls per IP per minute
    const hdrs = await headers();
    const ip = getClientIp(hdrs);
    const rl = rateLimit(`search:${ip}`, 60, 60_000);
    if (!rl.allowed) {
      return { success: false, error: "Terlalu banyak permintaan. Coba lagi sebentar." };
    }

    const session = await prisma.attendanceSession.findUnique({
      where: { qrCode },
      select: { id: true, classId: true, status: true },
    });

    if (!session || session.status !== "ACTIVE") {
      return { success: false, error: "Sesi tidak ditemukan atau sudah ditutup" };
    }

    const q = query.trim();

    const students = await prisma.student.findMany({
      where: {
        classId: session.classId,
        status: "ACTIVE",
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { nisn: { contains: q } },
          { nis: { contains: q } },
        ],
      },
      take: 10,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        nisn: true,
        nis: true,
      },
    });

    // Also fetch already-attended student IDs
    const attended = await prisma.attendance.findMany({
      where: { sessionId: session.id, studentId: { in: students.map((s) => s.id) } },
      select: { studentId: true },
    });
    const attendedSet = new Set(attended.map((a) => a.studentId));

    return {
      success: true,
      data: students.map((s) => ({
        ...s,
        alreadyAttended: attendedSet.has(s.id),
      })),
    };
  } catch {
    return { success: false, error: "Gagal mencari siswa" };
  }
}

/**
 * Submit attendance for a student via QR scan.
 */
export async function submitAttendance(
  qrCode: string,
  studentId: string,
  geo?: { latitude: number; longitude: number; accuracy?: number } | null
): Promise<ActionResult> {
  try {
    // ── Rate limit by IP (anti-spam) ──
    const hdrs = await headers();
    const ip = getClientIp(hdrs);
    const userAgent = hdrs.get("user-agent") ?? null;
    const devHash = deviceFingerprint(ip, userAgent);

    const rlIp = rateLimit(`submit:${ip}`, 10, 60_000);
    if (!rlIp.allowed) {
      return {
        success: false,
        error: "Terlalu banyak percobaan absen. Coba lagi sebentar.",
      };
    }

    // ── License gate ──
    await expireStaleLicenses();
    const lic = await getLicenseState();
    if (!lic.canWrite) {
      return {
        success: false,
        error: "Lisensi sekolah sudah kedaluwarsa. Silakan hubungi admin sekolah.",
      };
    }

    const session = await prisma.attendanceSession.findUnique({
      where: { qrCode },
      include: {
        class: { select: { id: true, name: true } },
      },
    });

    if (!session) {
      return { success: false, error: "QR Code tidak valid" };
    }

    if (session.status !== "ACTIVE") {
      return { success: false, error: "Sesi sudah ditutup" };
    }

    if (session.qrExpiresAt < new Date()) {
      // Auto-mark expired
      await prisma.attendanceSession.update({
        where: { id: session.id },
        data: { status: "EXPIRED" },
      });
      return { success: false, error: "QR Code sudah kedaluwarsa" };
    }

    // ── Per-session rate limit by IP (very strict — cegah enumerasi) ──
    const rlSession = rateLimit(`submit:${ip}:${session.id}`, 5, 60_000);
    if (!rlSession.allowed) {
      return {
        success: false,
        error: "Terlalu banyak percobaan untuk sesi ini. Tunggu sebentar.",
      };
    }

    // ── Device-fingerprint lock: 1 device = 1 attendance per session ──
    // Prevent siswa nakal absenkan teman dari HP/laptop yg sama.
    const existingFromSameDevice = await prisma.attendance.findFirst({
      where: { sessionId: session.id, deviceHash: devHash },
      select: { studentId: true, student: { select: { name: true } } },
    });
    if (existingFromSameDevice && existingFromSameDevice.studentId !== studentId) {
      return {
        success: false,
        error: `Perangkat ini sudah dipakai untuk absen atas nama ${existingFromSameDevice.student.name}. Satu HP hanya boleh untuk satu siswa per sesi.`,
      };
    }

    // Verify student belongs to class
    const student = await prisma.student.findFirst({
      where: { id: studentId, classId: session.classId, status: "ACTIVE" },
      select: { id: true, name: true },
    });

    if (!student) {
      return { success: false, error: "Siswa tidak ditemukan di kelas ini" };
    }

    // Check duplicate
    const existing = await prisma.attendance.findUnique({
      where: { sessionId_studentId: { sessionId: session.id, studentId } },
    });

    if (existing) {
      return { success: false, error: "Anda sudah melakukan absensi sebelumnya" };
    }

    // Geofence check — enforce if session requires it
    const sessionRequiresGeo =
      session.latitude != null &&
      session.longitude != null &&
      session.radius != null;

    if (sessionRequiresGeo) {
      if (!geo) {
        return {
          success: false,
          error: "Sesi ini memerlukan verifikasi lokasi. Aktifkan izin GPS pada browser Anda.",
        };
      }

      // Reject if GPS accuracy is too poor to trust
      const studentAcc = geo.accuracy ?? 0;
      if (studentAcc > 200) {
        return {
          success: false,
          error: `Akurasi GPS Anda terlalu rendah (±${Math.round(studentAcc)}m). Coba pindah ke luar ruangan, aktifkan GPS, lalu refresh halaman.`,
        };
      }

      const distance = distanceMeters(
        session.latitude!,
        session.longitude!,
        geo.latitude,
        geo.longitude
      );

      // Use accuracy as benefit-of-the-doubt tolerance
      // Effective check: distance must be within (radius + GPS uncertainty)
      const effectiveRadius = session.radius! + studentAcc;
      if (distance > effectiveRadius) {
        return {
          success: false,
          error: `Anda berada ${Math.round(distance)}m dari lokasi kelas (maks ${session.radius}m, akurasi GPS Anda ±${Math.round(studentAcc)}m). Mohon datang ke kelas untuk absen.`,
        };
      }
    }

    // Determine status: PRESENT or LATE if past scheduled time
    // Simple rule: PRESENT for now (no fixed time threshold in schema)
    const status: "PRESENT" | "LATE" = "PRESENT";

    await prisma.attendance.create({
      data: {
        sessionId: session.id,
        studentId,
        status,
        method: "QR",
        latitude: geo?.latitude,
        longitude: geo?.longitude,
        accuracy: geo?.accuracy,
        deviceInfo: userAgent,
        ipAddress: ip,
        deviceHash: devHash,
      },
    });

    // Set HTTP-only cookie to prevent refresh-bypass on the same device
    const cookieStore = await cookies();
    cookieStore.set(`th_att_${session.id}`, studentId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      expires: session.qrExpiresAt,
      path: `/scan/${qrCode}`,
    });

    revalidatePath(`/scan/${qrCode}`);
    // Invalidate cached reports so admin sees fresh data
    revalidateTag("reports", "max");

    return {
      success: true,
      data: {
        studentName: student.name,
        className: session.class.name,
        subject: session.subject,
        status,
        time: new Date().toISOString(),
      },
    };
  } catch (err) {
    console.error("[scan] submitAttendance error:", err);
    return { success: false, error: "Gagal mencatat kehadiran" };
  }
}
