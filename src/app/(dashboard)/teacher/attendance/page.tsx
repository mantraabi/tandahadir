// src/app/(dashboard)/teacher/attendance/page.tsx

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { expireStaleSessions } from "@/lib/expire-sessions";
import { LicenseBanner } from "@/components/license-banner";
import { AttendanceClient } from "./attendance-client";

export const dynamic = "force-dynamic";

export default async function TeacherAttendancePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
    redirect("/unauthorized");
  }

  const teacherId = session.user.id as string;

  // Flip ACTIVE -> EXPIRED for sessions whose QR window has passed
  await expireStaleSessions();

  const [sessionsRaw, classesRaw, schoolRaw] = await Promise.all([
    prisma.attendanceSession.findMany({
      where: { createdById: teacherId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        class: {
          select: {
            name: true,
            _count: { select: { students: { where: { status: "ACTIVE" } } } },
          },
        },
        attendances: { select: { status: true } },
      },
    }),
    prisma.class.findMany({
      where: { teacherId, isActive: true },
      orderBy: [{ grade: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { students: { where: { status: "ACTIVE" } } } },
      },
    }),
    prisma.school.findFirst({
      select: { latitude: true, longitude: true, defaultRadius: true },
    }),
  ]);

  const sessions = sessionsRaw.map((s) => ({
    id: s.id,
    classId: s.classId,
    className: s.class.name,
    date: s.date.toISOString(),
    subject: s.subject,
    qrCode: s.qrCode,
    qrExpiresAt: s.qrExpiresAt.toISOString(),
    status: s.status,
    createdAt: s.createdAt.toISOString(),
    presentCount: s.attendances.filter((a) => a.status === "PRESENT").length,
    totalCount: s.attendances.length,
    studentCount: s.class._count.students,
  }));

  const classes = classesRaw.map((c) => ({
    id: c.id,
    name: c.name,
    studentCount: c._count.students,
  }));

  const school = {
    latitude: schoolRaw?.latitude ?? null,
    longitude: schoolRaw?.longitude ?? null,
    defaultRadius: schoolRaw?.defaultRadius ?? null,
  };

  return (
    <div className="space-y-6">
      <LicenseBanner />
      <AttendanceClient sessions={sessions} classes={classes} school={school} />
    </div>
  );
}
