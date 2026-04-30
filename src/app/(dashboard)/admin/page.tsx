// src/app/(dashboard)/admin/page.tsx

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import {
  startOfJakartaDay,
  endOfJakartaDay,
  addJakartaDays,
  formatJakartaLongDate,
} from "@/lib/date";
import { LicenseBanner } from "@/components/license-banner";
import { AdminDashboard, type AdminDashboardData } from "./admin-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/unauthorized");

  const today = new Date();
  const todayStart = startOfJakartaDay(today);
  const todayEnd = endOfJakartaDay(today);
  const yesterdayStart = addJakartaDays(today, -1);
  const yesterdayEnd = new Date(todayStart.getTime() - 1);

  const [
    totalStudents,
    totalTeachers,
    totalClasses,
    todaySessionsRaw,
    yesterdayAttendancesRaw,
    todayAttendancesRaw,
    recentSessionsRaw,
    school,
    license,
  ] = await Promise.all([
    prisma.student.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { role: "TEACHER", isActive: true } }),
    prisma.class.count({ where: { isActive: true } }),
    prisma.attendanceSession.findMany({
      where: { date: { gte: todayStart, lte: todayEnd } },
      include: {
        class: { select: { name: true } },
        createdBy: { select: { name: true } },
        attendances: { select: { status: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.attendance.groupBy({
      by: ["status"],
      where: { checkInAt: { gte: yesterdayStart, lte: yesterdayEnd } },
      _count: { _all: true },
    }),
    prisma.attendance.groupBy({
      by: ["status"],
      where: { checkInAt: { gte: todayStart, lte: todayEnd } },
      _count: { _all: true },
    }),
    prisma.attendanceSession.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        class: { select: { name: true } },
        createdBy: { select: { name: true } },
        _count: { select: { attendances: true } },
      },
    }),
    prisma.school.findFirst(),
    prisma.license.findFirst({ orderBy: { createdAt: "desc" } }),
  ]);

  // Serialize today sessions
  const todaySessions = todaySessionsRaw.map((s) => ({
    id: s.id,
    status: s.status,
    subject: s.subject,
    createdAt: s.createdAt.toISOString(),
    className: s.class.name,
    createdByName: s.createdBy.name,
    presentCount: s.attendances.filter((a) => a.status === "PRESENT").length,
    totalCount: s.attendances.length,
  }));

  // Serialize recent sessions
  const recentSessions = recentSessionsRaw.map((s) => ({
    id: s.id,
    status: s.status,
    subject: s.subject,
    date: s.date.toISOString(),
    className: s.class.name,
    createdByName: s.createdBy.name,
    attendanceCount: s._count.attendances,
  }));

  // Serialize attendance stats
  const todayAttendances = todayAttendancesRaw.map((a) => ({
    status: a.status,
    count: a._count._all,
  }));

  const todayPresent =
    todayAttendances.find((a) => a.status === "PRESENT")?.count ?? 0;
  const todayTotal = todayAttendances.reduce((sum, a) => sum + a.count, 0);
  const yesterdayPresent =
    yesterdayAttendancesRaw.find((a) => a.status === "PRESENT")?._count._all ?? 0;
  const yesterdayTotal = yesterdayAttendancesRaw.reduce(
    (sum, a) => sum + a._count._all,
    0
  );

  const todayRate =
    todayTotal > 0 ? Math.round((todayPresent / todayTotal) * 100) : 0;
  const yesterdayRate =
    yesterdayTotal > 0
      ? Math.round((yesterdayPresent / yesterdayTotal) * 100)
      : 0;
  const rateTrend = todayRate - yesterdayRate;

  const activeSessions = todaySessions.filter((s) => s.status === "ACTIVE").length;

  // License info
  let licenseLabel = "Belum aktif";
  if (license) {
    const end =
      license.status === "TRIAL" ? license.trialEndsAt : license.licenseEndsAt;
    const licenseDays = end
      ? Math.max(0, Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;
    licenseLabel =
      license.status === "TRIAL"
        ? `Trial · ${licenseDays} hari lagi`
        : license.status === "ACTIVE"
        ? `Aktif · ${licenseDays} hari lagi`
        : license.status;
  }

  const data: AdminDashboardData = {
    userName: session.user.name?.split(" ")[0] ?? "Admin",
    schoolName: school?.name ?? "sekolah Anda",
    dateFormatted: formatJakartaLongDate(today),
    licenseLabel,
    totalStudents,
    totalTeachers,
    totalClasses,
    todayRate,
    todayPresent,
    todayTotal,
    rateTrend,
    yesterdayTotal,
    activeSessions,
    todaySessions,
    recentSessions,
    todayAttendances,
  };

  return (
    <div className="space-y-6">
      <LicenseBanner adminLink />
      <AdminDashboard data={data} />
    </div>
  );
}
