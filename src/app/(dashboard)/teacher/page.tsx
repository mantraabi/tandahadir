// src/app/(dashboard)/teacher/page.tsx

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import {
  startOfJakartaDay,
  endOfJakartaDay,
  addJakartaDays,
  formatJakartaLongDate,
  jakartaDateKey,
} from "@/lib/date";
import { LicenseBanner } from "@/components/license-banner";
import { TeacherDashboard, type TeacherDashboardData } from "./teacher-dashboard";

export const dynamic = "force-dynamic";

export default async function TeacherDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
    redirect("/unauthorized");
  }

  const teacherId = session.user.id as string;
  const today = new Date();
  const todayStart = startOfJakartaDay(today);
  const todayEnd = endOfJakartaDay(today);

  // Last 7 days for trend
  const weekStart = addJakartaDays(today, -6);

  const [
    myClasses,
    todaySessionsRaw,
    recentSessionsRaw,
    weeklyAttendancesRaw,
    todayAttendancesRaw,
  ] = await Promise.all([
    // Classes assigned to this teacher
    prisma.class.findMany({
      where: { teacherId, isActive: true },
      orderBy: [{ grade: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { students: { where: { status: "ACTIVE" } } } },
      },
    }),

    // Today's sessions created by this teacher
    prisma.attendanceSession.findMany({
      where: {
        createdById: teacherId,
        date: { gte: todayStart, lte: todayEnd },
      },
      include: {
        class: { select: { name: true } },
        attendances: { select: { status: true } },
      },
      orderBy: { createdAt: "desc" },
    }),

    // Recent 8 sessions
    prisma.attendanceSession.findMany({
      where: { createdById: teacherId },
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        class: { select: { name: true } },
        _count: { select: { attendances: true } },
      },
    }),

    // Weekly attendance for trend (sessions by this teacher)
    prisma.attendance.findMany({
      where: {
        session: { createdById: teacherId },
        checkInAt: { gte: weekStart, lte: todayEnd },
      },
      select: {
        status: true,
        checkInAt: true,
      },
    }),

    // Today's attendance breakdown
    prisma.attendance.groupBy({
      by: ["status"],
      where: {
        session: { createdById: teacherId },
        checkInAt: { gte: todayStart, lte: todayEnd },
      },
      _count: { _all: true },
    }),
  ]);

  // Total students across my classes
  const totalMyStudents = myClasses.reduce((sum, c) => sum + c._count.students, 0);

  // Serialize classes
  const classes = myClasses.map((c) => ({
    id: c.id,
    name: c.name,
    grade: c.grade,
    studentCount: c._count.students,
  }));

  // Today sessions
  const todaySessions = todaySessionsRaw.map((s) => ({
    id: s.id,
    status: s.status,
    subject: s.subject,
    createdAt: s.createdAt.toISOString(),
    className: s.class.name,
    presentCount: s.attendances.filter((a) => a.status === "PRESENT").length,
    lateCount: s.attendances.filter((a) => a.status === "LATE").length,
    absentCount: s.attendances.filter((a) => a.status === "ABSENT").length,
    totalCount: s.attendances.length,
  }));

  // Recent sessions
  const recentSessions = recentSessionsRaw.map((s) => ({
    id: s.id,
    status: s.status,
    subject: s.subject,
    date: s.date.toISOString(),
    className: s.class.name,
    attendanceCount: s._count.attendances,
  }));

  // Today stats
  const todayStats = todayAttendancesRaw.map((a) => ({
    status: a.status,
    count: a._count._all,
  }));
  const todayPresent = todayStats.find((a) => a.status === "PRESENT")?.count ?? 0;
  const todayLate = todayStats.find((a) => a.status === "LATE")?.count ?? 0;
  const todayAbsent = todayStats.find((a) => a.status === "ABSENT")?.count ?? 0;
  const todayTotal = todayStats.reduce((sum, a) => sum + a.count, 0);
  const todayRate = todayTotal > 0 ? Math.round((todayPresent / todayTotal) * 100) : 0;

  // Weekly trend (group by Jakarta day)
  const dayMap = new Map<string, { present: number; absent: number; late: number; total: number }>();
  for (let i = 0; i < 7; i++) {
    const d = addJakartaDays(today, i - 6);
    dayMap.set(jakartaDateKey(d), { present: 0, absent: 0, late: 0, total: 0 });
  }
  for (const a of weeklyAttendancesRaw) {
    const key = jakartaDateKey(a.checkInAt);
    const entry = dayMap.get(key);
    if (entry) {
      entry.total++;
      if (a.status === "PRESENT") entry.present++;
      else if (a.status === "ABSENT") entry.absent++;
      else if (a.status === "LATE") entry.late++;
    }
  }

  const weeklyTrend = Array.from(dayMap.entries()).map(([date, val]) => {
    const d = new Date(date + "T00:00:00.000Z");
    const label = new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      weekday: "short",
      day: "2-digit",
    }).format(d);
    return {
      date,
      label,
      ...val,
      rate: val.total > 0 ? Math.round((val.present / val.total) * 100) : 0,
    };
  });

  const activeSessions = todaySessions.filter((s) => s.status === "ACTIVE").length;

  const data: TeacherDashboardData = {
    userName: session.user.name?.split(" ")[0] ?? "Guru",
    dateFormatted: formatJakartaLongDate(today),
    totalClasses: myClasses.length,
    totalMyStudents,
    todayRate,
    todayPresent,
    todayLate,
    todayAbsent,
    todayTotal,
    activeSessions,
    todaySessions,
    recentSessions,
    weeklyTrend,
    classes,
  };

  return (
    <div className="space-y-6">
      <LicenseBanner />
      <TeacherDashboard data={data} />
    </div>
  );
}
