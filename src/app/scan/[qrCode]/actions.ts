"use server";

// src/app/scan/[qrCode]/actions.ts

import { prisma } from "@/lib/db/prisma";
import { headers, cookies } from "next/headers";
import { revalidatePath } from "next/cache";

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
  geo?: { latitude: number; longitude: number } | null
): Promise<ActionResult> {
  try {
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
      const distance = distanceMeters(
        session.latitude!,
        session.longitude!,
        geo.latitude,
        geo.longitude
      );
      if (distance > session.radius!) {
        return {
          success: false,
          error: `Anda berada ${Math.round(distance)}m dari lokasi kelas (maks ${session.radius}m). Mohon datang ke kelas untuk absen.`,
        };
      }
    }

    // Determine status: PRESENT or LATE if past scheduled time
    // Simple rule: PRESENT for now (no fixed time threshold in schema)
    const status: "PRESENT" | "LATE" = "PRESENT";

    const hdrs = await headers();
    const userAgent = hdrs.get("user-agent") ?? null;

    await prisma.attendance.create({
      data: {
        sessionId: session.id,
        studentId,
        status,
        method: "QR",
        latitude: geo?.latitude,
        longitude: geo?.longitude,
        deviceInfo: userAgent,
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
