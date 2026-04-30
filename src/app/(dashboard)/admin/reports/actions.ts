"use server";

// src/app/(dashboard)/admin/reports/actions.ts

import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
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

type StatusKey = "PRESENT" | "ABSENT" | "LATE" | "SICK" | "PERMIT";
const STATUS_KEYS: StatusKey[] = ["PRESENT", "ABSENT", "LATE", "SICK", "PERMIT"];

export async function getReportData(filters: ReportFilters): Promise<ReportData> {
  await requireAdmin();
  return getCachedReportData(filters);
}

const getCachedReportData = unstable_cache(
  async (filters: ReportFilters): Promise<ReportData> => {
    return computeReportData(filters);
  },
  ["report-data"],
  {
    tags: ["reports"],
    revalidate: 60, // 60s TTL fallback
  }
);

async function computeReportData(filters: ReportFilters): Promise<ReportData> {
  // Normalize filter dates
  const startDate = filters.startDate ? new Date(filters.startDate) : null;
  let endDate: Date | null = null;
  if (filters.endDate) {
    endDate = new Date(filters.endDate);
    endDate.setHours(23, 59, 59, 999);
  }
  const classId = filters.classId ?? null;

  // Build session filter for Prisma typed queries
  const sessionWhere: Prisma.AttendanceSessionWhereInput = {};
  if (classId) sessionWhere.classId = classId;
  if (startDate || endDate) {
    sessionWhere.date = {};
    if (startDate) sessionWhere.date.gte = startDate;
    if (endDate) sessionWhere.date.lte = endDate;
  }

  // SQL filter clause shared by raw queries
  const sqlFilter = Prisma.sql`
    WHERE 1=1
      ${classId ? Prisma.sql`AND s."classId" = ${classId}` : Prisma.empty}
      ${startDate ? Prisma.sql`AND s."date" >= ${startDate}` : Prisma.empty}
      ${endDate ? Prisma.sql`AND s."date" <= ${endDate}` : Prisma.empty}
  `;

  // Fire all queries in parallel
  const [
    totalClasses,
    totalStudents,
    totalSessions,
    statusRows,
    perClassRows,
    perDayRows,
    classes,
  ] = await Promise.all([
    prisma.class.count({ where: { isActive: true } }),
    prisma.student.count({ where: { status: "ACTIVE" } }),
    prisma.attendanceSession.count({ where: sessionWhere }),

    // Status summary — groupBy supports relation filter
    prisma.attendance.groupBy({
      by: ["status"],
      where: { session: sessionWhere },
      _count: { _all: true },
    }),

    // Per-class breakdown via SQL JOIN
    prisma.$queryRaw<
      { classId: string; status: StatusKey; cnt: bigint; sessionCnt: bigint }[]
    >`
      SELECT
        s."classId"        AS "classId",
        a."status"         AS "status",
        COUNT(*)::bigint   AS "cnt",
        COUNT(DISTINCT s."date")::bigint AS "sessionCnt"
      FROM attendances a
      INNER JOIN attendance_sessions s ON a."sessionId" = s."id"
      ${sqlFilter}
      GROUP BY s."classId", a."status"
    `,

    // Daily trend via SQL JOIN
    prisma.$queryRaw<
      { date: Date; status: StatusKey; cnt: bigint }[]
    >`
      SELECT
        s."date"         AS "date",
        a."status"       AS "status",
        COUNT(*)::bigint AS "cnt"
      FROM attendances a
      INNER JOIN attendance_sessions s ON a."sessionId" = s."id"
      ${sqlFilter}
      GROUP BY s."date", a."status"
      ORDER BY s."date" ASC
    `,

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

  // ─── Build status summary ───
  const statusSummary: StatusSummary = {
    present: 0, absent: 0, late: 0, sick: 0, permit: 0, total: 0,
  };
  for (const row of statusRows) {
    const c = row._count._all;
    statusSummary.total += c;
    switch (row.status as StatusKey) {
      case "PRESENT": statusSummary.present = c; break;
      case "ABSENT": statusSummary.absent = c; break;
      case "LATE": statusSummary.late = c; break;
      case "SICK": statusSummary.sick = c; break;
      case "PERMIT": statusSummary.permit = c; break;
    }
  }

  const overallRate = statusSummary.total > 0
    ? Math.round(((statusSummary.present + statusSummary.late) / statusSummary.total) * 100)
    : 0;

  // ─── Build per-class breakdown ───
  type ClassBucket = Record<StatusKey, number> & { sessionCount: number };
  const classMap = new Map<string, ClassBucket>();

  for (const row of perClassRows) {
    let entry = classMap.get(row.classId);
    if (!entry) {
      entry = { PRESENT: 0, ABSENT: 0, LATE: 0, SICK: 0, PERMIT: 0, sessionCount: 0 };
      classMap.set(row.classId, entry);
    }
    entry[row.status] = Number(row.cnt);
    // sessionCnt is per (classId, status); take max as the distinct-date count for class
    entry.sessionCount = Math.max(entry.sessionCount, Number(row.sessionCnt));
  }

  const classAttendance: ClassAttendanceRow[] = classes.map((c) => {
    const d = classMap.get(c.id);
    const present = d?.PRESENT ?? 0;
    const absent = d?.ABSENT ?? 0;
    const late = d?.LATE ?? 0;
    const sick = d?.SICK ?? 0;
    const permit = d?.PERMIT ?? 0;
    const total = present + absent + late + sick + permit;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return {
      classId: c.id,
      className: c.name,
      totalStudents: c._count.students,
      totalSessions: d?.sessionCount ?? 0,
      present, absent, late, sick, permit,
      rate,
    };
  });

  // ─── Build daily trend ───
  const dayMap = new Map<string, Record<StatusKey, number>>();
  for (const row of perDayRows) {
    const dateKey = row.date.toISOString().split("T")[0];
    let entry = dayMap.get(dateKey);
    if (!entry) {
      entry = { PRESENT: 0, ABSENT: 0, LATE: 0, SICK: 0, PERMIT: 0 };
      dayMap.set(dateKey, entry);
    }
    entry[row.status] = Number(row.cnt);
  }

  const dailyTrend: DailyTrendItem[] = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => {
      const total = STATUS_KEYS.reduce((sum, k) => sum + d[k], 0);
      const dateObj = new Date(date);
      return {
        date,
        label: new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short" }).format(dateObj),
        present: d.PRESENT,
        absent: d.ABSENT,
        late: d.LATE,
        sick: d.SICK,
        permit: d.PERMIT,
        total,
        rate: total > 0 ? Math.round(((d.PRESENT + d.LATE) / total) * 100) : 0,
      };
    });

  return {
    summary: {
      totalClasses,
      totalStudents,
      totalSessions,
      totalAttendances: statusSummary.total,
      overallRate,
    },
    statusSummary,
    classAttendance,
    dailyTrend,
  };
}
