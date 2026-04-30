"use server";

// src/app/(dashboard)/admin/audit/actions.ts

import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
}

export type AuditFilters = {
  classId?: string;
  studentQuery?: string;   // search by name / NIS
  status?: string;         // PRESENT / LATE / ABSENT / SICK / PERMIT
  method?: string;         // QR / MANUAL
  startDate?: string;      // YYYY-MM-DD
  endDate?: string;
  suspiciousOnly?: boolean;
  page?: number;
  perPage?: number;
};

export type AuditRow = {
  id: string;
  date: string;
  className: string;
  subject: string;
  studentNis: string;
  studentName: string;
  status: string;
  method: string;
  checkInAt: string | null;
  ipAddress: string | null;
  deviceHash: string | null;
  accuracy: number | null;
  deviceInfo: string | null;
  isSuspicious: boolean;       // device shared with other students in any session
  duplicateCount: number;      // how many other students share this deviceHash
};

export type AuditResult = {
  rows: AuditRow[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  suspiciousTotal: number;
};

export async function getAuditLogs(filters: AuditFilters): Promise<AuditResult> {
  await requireAdmin();

  const page = Math.max(1, filters.page ?? 1);
  const perPage = Math.min(100, Math.max(10, filters.perPage ?? 25));

  // Build session filter
  const sessionWhere: Prisma.AttendanceSessionWhereInput = {};
  if (filters.classId) sessionWhere.classId = filters.classId;
  const startDate = filters.startDate ? new Date(filters.startDate) : null;
  let endDate: Date | null = null;
  if (filters.endDate) {
    endDate = new Date(filters.endDate);
    endDate.setHours(23, 59, 59, 999);
  }
  if (startDate || endDate) {
    sessionWhere.date = {};
    if (startDate) sessionWhere.date.gte = startDate;
    if (endDate) sessionWhere.date.lte = endDate;
  }

  // Build attendance filter
  const where: Prisma.AttendanceWhereInput = { session: sessionWhere };
  if (filters.status) where.status = filters.status as Prisma.AttendanceWhereInput["status"];
  if (filters.method) where.method = filters.method as Prisma.AttendanceWhereInput["method"];
  if (filters.studentQuery) {
    const q = filters.studentQuery.trim();
    if (q) {
      where.student = {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { nis: { contains: q } },
          { nisn: { contains: q } },
        ],
      };
    }
  }

  // Get total count first (cheap with index)
  const total = await prisma.attendance.count({ where });

  // Fetch full filtered rows for analysis (we need duplicate-detection across the result set,
  // capped to a sane upper bound to avoid memory issues)
  const ALL_CAP = 5000;
  const allRows = await prisma.attendance.findMany({
    where,
    take: ALL_CAP,
    orderBy: [{ session: { date: "desc" } }, { checkInAt: "desc" }],
    select: {
      id: true,
      status: true,
      method: true,
      checkInAt: true,
      ipAddress: true,
      deviceHash: true,
      accuracy: true,
      deviceInfo: true,
      session: {
        select: { date: true, subject: true, class: { select: { name: true } } },
      },
      student: { select: { id: true, nis: true, name: true } },
    },
  });

  // Detect device sharing — same deviceHash mapping to multiple distinct studentIds
  const hashToStudents = new Map<string, Set<string>>();
  for (const r of allRows) {
    if (!r.deviceHash) continue;
    let set = hashToStudents.get(r.deviceHash);
    if (!set) {
      set = new Set();
      hashToStudents.set(r.deviceHash, set);
    }
    set.add(r.student.id);
  }

  const enriched: AuditRow[] = allRows.map((r) => {
    const distinct = r.deviceHash ? (hashToStudents.get(r.deviceHash)?.size ?? 1) : 1;
    return {
      id: r.id,
      date: r.session.date.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }),
      className: r.session.class.name,
      subject: r.session.subject ?? "",
      studentNis: r.student.nis ?? "",
      studentName: r.student.name,
      status: r.status,
      method: r.method,
      checkInAt: r.checkInAt
        ? r.checkInAt.toLocaleTimeString("id-ID", {
            timeZone: "Asia/Jakarta",
            hour: "2-digit",
            minute: "2-digit",
          })
        : null,
      ipAddress: r.ipAddress,
      deviceHash: r.deviceHash,
      accuracy: r.accuracy,
      deviceInfo: r.deviceInfo,
      isSuspicious: distinct > 1,
      duplicateCount: distinct - 1,
    };
  });

  const suspiciousTotal = enriched.filter((r) => r.isSuspicious).length;

  // Apply suspicious filter after enrichment
  const filtered = filters.suspiciousOnly
    ? enriched.filter((r) => r.isSuspicious)
    : enriched;

  // Paginate
  const start = (page - 1) * perPage;
  const rows = filtered.slice(start, start + perPage);
  const effectiveTotal = filters.suspiciousOnly ? filtered.length : total;

  return {
    rows,
    total: effectiveTotal,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(effectiveTotal / perPage)),
    suspiciousTotal,
  };
}
