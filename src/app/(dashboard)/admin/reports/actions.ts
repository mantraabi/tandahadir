"use server";

// src/app/(dashboard)/admin/reports/actions.ts

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export type ReportFilters = {
  classId?: string;
  startDate?: string;
  endDate?: string;
};

export type ClassAttendanceRow = {
  classId: string;
  className: string;
  totalStudents: number;
  totalSessions: number;
  present: number;
  absent: number;
  late: number;
  sick: number;
  permit: number;
  rate: number;
};

export type DailyTrendItem = {
  date: string;
  label: string;
  present: number;
  absent: number;
  late: number;
  sick: number;
  permit: number;
  total: number;
  rate: number;
};

export type StatusSummary = {
  present: number;
  absent: number;
  late: number;
  sick: number;
  permit: number;
  total: number;
};

export type ReportData = {
  summary: {
    totalClasses: number;
    totalStudents: number;
    totalSessions: number;
    totalAttendances: number;
    overallRate: number;
  };
  statusSummary: StatusSummary;
  classAttendance: ClassAttendanceRow[];
  dailyTrend: DailyTrendItem[];
};

export async function getReportData(filters: ReportFilters): Promise<ReportData> {
  await requireAdmin();

  const where: Record<string, unknown> = {};
  const sessionWhere: Record<string, unknown> = {};

  if (filters.classId) {
    sessionWhere.classId = filters.classId;
  }

  if (filters.startDate || filters.endDate) {
    const dateFilter: Record<string, Date> = {};
    if (filters.startDate) dateFilter.gte = new Date(filters.startDate);
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }
    sessionWhere.date = dateFilter;
  }

  if (Object.keys(sessionWhere).length > 0) {
    where.session = sessionWhere;
  }

  // Fetch all data in parallel
  const [
    totalClasses,
    totalStudents,
    totalSessions,
    attendances,
    classes,
  ] = await Promise.all([
    prisma.class.count({ where: { isActive: true } }),
    prisma.student.count({ where: { status: "ACTIVE" } }),
    prisma.attendanceSession.count({
      where: sessionWhere as any,
    }),
    prisma.attendance.findMany({
      where: where as any,
      select: {
        status: true,
        session: {
          select: {
            classId: true,
            date: true,
          },
        },
      },
    }),
    prisma.class.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        _count: { select: { students: { where: { status: "ACTIVE" } } } },
      },
      orderBy: [{ grade: "asc" }, { name: "asc" }],
    }),
  ]);

  // Status summary
  const statusSummary: StatusSummary = {
    present: 0,
    absent: 0,
    late: 0,
    sick: 0,
    permit: 0,
    total: attendances.length,
  };

  for (const a of attendances) {
    switch (a.status) {
      case "PRESENT": statusSummary.present++; break;
      case "ABSENT": statusSummary.absent++; break;
      case "LATE": statusSummary.late++; break;
      case "SICK": statusSummary.sick++; break;
      case "PERMIT": statusSummary.permit++; break;
    }
  }

  const overallRate = statusSummary.total > 0
    ? Math.round(((statusSummary.present + statusSummary.late) / statusSummary.total) * 100)
    : 0;

  // Per-class breakdown
  const classMap = new Map<string, {
    present: number; absent: number; late: number; sick: number; permit: number;
    sessions: Set<string>;
  }>();

  for (const a of attendances) {
    const cid = a.session.classId;
    if (!classMap.has(cid)) {
      classMap.set(cid, { present: 0, absent: 0, late: 0, sick: 0, permit: 0, sessions: new Set() });
    }
    const entry = classMap.get(cid)!;
    const dateKey = a.session.date.toISOString().split("T")[0];
    entry.sessions.add(dateKey);
    switch (a.status) {
      case "PRESENT": entry.present++; break;
      case "ABSENT": entry.absent++; break;
      case "LATE": entry.late++; break;
      case "SICK": entry.sick++; break;
      case "PERMIT": entry.permit++; break;
    }
  }

  const classAttendance: ClassAttendanceRow[] = classes.map((c) => {
    const data = classMap.get(c.id);
    const total = data
      ? data.present + data.absent + data.late + data.sick + data.permit
      : 0;
    const rate = total > 0
      ? Math.round(((data?.present ?? 0) + (data?.late ?? 0)) / total * 100)
      : 0;
    return {
      classId: c.id,
      className: c.name,
      totalStudents: c._count.students,
      totalSessions: data?.sessions.size ?? 0,
      present: data?.present ?? 0,
      absent: data?.absent ?? 0,
      late: data?.late ?? 0,
      sick: data?.sick ?? 0,
      permit: data?.permit ?? 0,
      rate,
    };
  });

  // Daily trend
  const dayMap = new Map<string, {
    present: number; absent: number; late: number; sick: number; permit: number;
  }>();

  for (const a of attendances) {
    const dateKey = a.session.date.toISOString().split("T")[0];
    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, { present: 0, absent: 0, late: 0, sick: 0, permit: 0 });
    }
    const entry = dayMap.get(dateKey)!;
    switch (a.status) {
      case "PRESENT": entry.present++; break;
      case "ABSENT": entry.absent++; break;
      case "LATE": entry.late++; break;
      case "SICK": entry.sick++; break;
      case "PERMIT": entry.permit++; break;
    }
  }

  const dailyTrend: DailyTrendItem[] = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => {
      const total = d.present + d.absent + d.late + d.sick + d.permit;
      const dateObj = new Date(date);
      return {
        date,
        label: new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short" }).format(dateObj),
        present: d.present,
        absent: d.absent,
        late: d.late,
        sick: d.sick,
        permit: d.permit,
        total,
        rate: total > 0 ? Math.round(((d.present + d.late) / total) * 100) : 0,
      };
    });

  return {
    summary: {
      totalClasses,
      totalStudents,
      totalSessions,
      totalAttendances: attendances.length,
      overallRate,
    },
    statusSummary,
    classAttendance,
    dailyTrend,
  };
}
