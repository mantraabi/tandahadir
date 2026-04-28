"use server";

// src/app/(dashboard)/teacher/attendance/actions.ts

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { getJakartaToday } from "@/lib/date";

type ActionResult = {
  success: boolean;
  error?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
};

async function requireTeacher() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

// ─── Create Attendance Session ───

export async function createAttendanceSession(formData: FormData): Promise<ActionResult> {
  try {
    const teacher = await requireTeacher();

    const classId = formData.get("classId") as string;
    const subject = (formData.get("subject") as string) || null;
    const durationMin = parseInt(formData.get("duration") as string) || 30;

    if (!classId) {
      return { success: false, error: "Pilih kelas terlebih dahulu" };
    }

    // Verify teacher owns this class
    const cls = await prisma.class.findFirst({
      where: { id: classId, teacherId: teacher.id as string, isActive: true },
    });
    if (!cls) {
      return { success: false, error: "Kelas tidak ditemukan atau bukan kelas Anda" };
    }

    // Check for existing active session for this class today (Jakarta timezone)
    const today = getJakartaToday();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingActive = await prisma.attendanceSession.findFirst({
      where: {
        classId,
        createdById: teacher.id as string,
        date: { gte: today, lt: tomorrow },
        status: "ACTIVE",
      },
    });

    if (existingActive) {
      return { success: false, error: "Sudah ada sesi aktif untuk kelas ini hari ini" };
    }

    const qrCode = randomUUID();
    const qrExpiresAt = new Date(Date.now() + durationMin * 60 * 1000);

    const session = await prisma.attendanceSession.create({
      data: {
        classId,
        createdById: teacher.id as string,
        date: today,
        subject,
        qrCode,
        qrExpiresAt,
        status: "ACTIVE",
      },
    });

    revalidatePath("/teacher/attendance");
    return { success: true, data: { sessionId: session.id, qrCode } };
  } catch {
    return { success: false, error: "Gagal membuat sesi absensi" };
  }
}

// ─── Close Session ───

export async function closeSession(sessionId: string): Promise<ActionResult> {
  try {
    const teacher = await requireTeacher();

    const session = await prisma.attendanceSession.findFirst({
      where: { id: sessionId, createdById: teacher.id as string },
    });

    if (!session) return { success: false, error: "Sesi tidak ditemukan" };
    if (session.status !== "ACTIVE") return { success: false, error: "Sesi sudah ditutup" };

    await prisma.attendanceSession.update({
      where: { id: sessionId },
      data: { status: "CLOSED" },
    });

    revalidatePath("/teacher/attendance");
    return { success: true };
  } catch {
    return { success: false, error: "Gagal menutup sesi" };
  }
}

// ─── Cancel Session ───

export async function cancelSession(sessionId: string): Promise<ActionResult> {
  try {
    const teacher = await requireTeacher();

    const session = await prisma.attendanceSession.findFirst({
      where: { id: sessionId, createdById: teacher.id as string },
    });

    if (!session) return { success: false, error: "Sesi tidak ditemukan" };

    await prisma.attendanceSession.update({
      where: { id: sessionId },
      data: { status: "CANCELLED" },
    });

    revalidatePath("/teacher/attendance");
    return { success: true };
  } catch {
    return { success: false, error: "Gagal membatalkan sesi" };
  }
}

// ─── Mark Attendance (Manual) ───

export async function markAttendance(
  sessionId: string,
  studentId: string,
  status: string
): Promise<ActionResult> {
  try {
    const teacher = await requireTeacher();

    const session = await prisma.attendanceSession.findFirst({
      where: { id: sessionId, createdById: teacher.id as string },
    });

    if (!session) return { success: false, error: "Sesi tidak ditemukan" };

    const validStatuses = ["PRESENT", "ABSENT", "LATE", "SICK", "PERMIT"];
    if (!validStatuses.includes(status)) {
      return { success: false, error: "Status tidak valid" };
    }

    // Upsert attendance
    const existing = await prisma.attendance.findUnique({
      where: { sessionId_studentId: { sessionId, studentId } },
    });

    if (existing) {
      await prisma.attendance.update({
        where: { id: existing.id },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: { status: status as any, method: "MANUAL" },
      });
    } else {
      await prisma.attendance.create({
        data: {
          sessionId,
          studentId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          status: status as any,
          method: "MANUAL",
        },
      });
    }

    revalidatePath("/teacher/attendance");
    return { success: true };
  } catch {
    return { success: false, error: "Gagal mencatat kehadiran" };
  }
}

// ─── Bulk Mark All Absent (for students who haven't checked in) ───

export async function markAllAbsent(sessionId: string): Promise<ActionResult> {
  try {
    const teacher = await requireTeacher();

    const session = await prisma.attendanceSession.findFirst({
      where: { id: sessionId, createdById: teacher.id as string },
      include: { class: { include: { students: { where: { status: "ACTIVE" } } } } },
    });

    if (!session) return { success: false, error: "Sesi tidak ditemukan" };

    const existingAttendances = await prisma.attendance.findMany({
      where: { sessionId },
      select: { studentId: true },
    });

    const attendedIds = new Set(existingAttendances.map((a) => a.studentId));
    const missingStudents = session.class.students.filter((s) => !attendedIds.has(s.id));

    if (missingStudents.length === 0) {
      return { success: false, error: "Semua siswa sudah tercatat" };
    }

    await prisma.attendance.createMany({
      data: missingStudents.map((s) => ({
        sessionId,
        studentId: s.id,
        status: "ABSENT" as const,
        method: "MANUAL" as const,
      })),
    });

    revalidatePath("/teacher/attendance");
    return { success: true, data: { count: missingStudents.length } };
  } catch {
    return { success: false, error: "Gagal mencatat absen massal" };
  }
}

// ─── Delete Session ───

export async function deleteSession(sessionId: string): Promise<ActionResult> {
  try {
    const teacher = await requireTeacher();

    const session = await prisma.attendanceSession.findFirst({
      where: { id: sessionId, createdById: teacher.id as string },
    });

    if (!session) return { success: false, error: "Sesi tidak ditemukan" };

    // Delete attendances first (cascade), then session
    await prisma.attendance.deleteMany({ where: { sessionId } });
    await prisma.attendanceSession.delete({ where: { id: sessionId } });

    revalidatePath("/teacher/attendance");
    return { success: true };
  } catch {
    return { success: false, error: "Gagal menghapus sesi" };
  }
}

// ─── Get Session Detail ───

export async function getSessionDetail(sessionId: string) {
  const teacher = await requireTeacher();

  const session = await prisma.attendanceSession.findFirst({
    where: { id: sessionId, createdById: teacher.id as string },
    include: {
      class: {
        include: {
          students: {
            where: { status: "ACTIVE" },
            orderBy: { name: "asc" },
            select: { id: true, name: true, nisn: true, nis: true },
          },
        },
      },
      attendances: {
        include: {
          student: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!session) return null;

  return {
    id: session.id,
    classId: session.classId,
    className: session.class.name,
    date: session.date.toISOString(),
    subject: session.subject,
    qrCode: session.qrCode,
    qrExpiresAt: session.qrExpiresAt.toISOString(),
    status: session.status,
    createdAt: session.createdAt.toISOString(),
    students: session.class.students.map((s) => ({
      id: s.id,
      name: s.name,
      nisn: s.nisn,
      nis: s.nis,
    })),
    attendances: session.attendances.map((a) => ({
      id: a.id,
      studentId: a.studentId,
      studentName: a.student.name,
      status: a.status,
      method: a.method,
      checkInAt: a.checkInAt.toISOString(),
    })),
  };
}
