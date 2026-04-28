"use client";

// src/app/(dashboard)/admin/admin-dashboard.tsx

import Link from "next/link";
import {
  Users,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  QrCode,
  FileSignature,
  UserPlus,
  BarChart3,
  CalendarDays,
  ArrowRight,
} from "lucide-react";
import { StatsCard } from "@/components/shared/stats-card";

type SessionItem = {
  id: string;
  status: string;
  subject: string | null;
  createdAt: string;
  className: string;
  createdByName: string;
  presentCount: number;
  totalCount: number;
};

type RecentItem = {
  id: string;
  status: string;
  subject: string | null;
  date: string;
  className: string;
  createdByName: string;
  attendanceCount: number;
};

type AttendanceStat = {
  status: string;
  count: number;
};

export type AdminDashboardData = {
  userName: string;
  schoolName: string;
  dateFormatted: string;
  licenseLabel: string;
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  todayRate: number;
  todayPresent: number;
  todayTotal: number;
  rateTrend: number;
  yesterdayTotal: number;
  activeSessions: number;
  todaySessions: SessionItem[];
  recentSessions: RecentItem[];
  todayAttendances: AttendanceStat[];
};

const STATUS_LABEL: Record<string, string> = {
  PRESENT: "Hadir",
  ABSENT: "Alpa",
  LATE: "Terlambat",
  SICK: "Sakit",
  PERMIT: "Izin",
};

const STATUS_COLOR: Record<string, string> = {
  PRESENT: "bg-green-50 text-green-600",
  ABSENT: "bg-red-50 text-red-500",
  LATE: "bg-amber-50 text-amber-600",
  SICK: "bg-blue-50 text-blue-600",
  PERMIT: "bg-purple-50 text-purple-600",
};

const SESSION_LABEL: Record<string, string> = {
  ACTIVE: "Aktif",
  CLOSED: "Selesai",
  EXPIRED: "Kedaluwarsa",
  CANCELLED: "Dibatalkan",
};

const SESSION_COLOR: Record<string, string> = {
  ACTIVE: "bg-green-50 text-green-600",
  CLOSED: "bg-gray-100 text-gray-600",
  EXPIRED: "bg-red-50 text-red-500",
  CANCELLED: "bg-gray-100 text-gray-500",
};

function formatTime(d: string) {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}

function formatDate(d: string) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(d));
}

export function AdminDashboard({ data }: { data: AdminDashboardData }) {
  const {
    userName,
    schoolName,
    dateFormatted,
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
  } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            {dateFormatted}
          </p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            Halo, {userName} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Ringkasan aktivitas{" "}
            <span className="font-semibold text-gray-700">{schoolName}</span>{" "}
            hari ini.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl">
          <CalendarDays size={16} className="text-amber-600" />
          <span className="text-xs font-semibold text-amber-700">
            Lisensi: {licenseLabel}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Siswa"
          value={totalStudents}
          subtitle="Status aktif"
          icon={GraduationCap}
          color="teal"
        />
        <StatsCard
          title="Total Guru"
          value={totalTeachers}
          subtitle="Pengajar aktif"
          icon={Users}
          color="blue"
        />
        <StatsCard
          title="Total Kelas"
          value={totalClasses}
          subtitle="Kelas berjalan"
          icon={BookOpen}
          color="purple"
        />
        <StatsCard
          title="Kehadiran Hari Ini"
          value={`${todayRate}%`}
          subtitle={`${todayPresent} dari ${todayTotal} siswa`}
          icon={ClipboardCheck}
          color={rateTrend >= 0 ? "green" : "amber"}
          trend={
            yesterdayTotal > 0
              ? { value: rateTrend, label: "vs kemarin" }
              : undefined
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sesi hari ini */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Sesi Absensi Hari Ini
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {todaySessions.length} sesi · {activeSessions} aktif
              </p>
            </div>
            <Link
              href="/admin/reports"
              className="text-xs font-semibold text-[#0d5c63] hover:underline inline-flex items-center gap-1"
            >
              Laporan <ArrowRight size={12} />
            </Link>
          </div>

          {todaySessions.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                <QrCode size={20} className="text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-700">
                Belum ada sesi absensi hari ini
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Sesi akan muncul setelah guru memulai absensi.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {todaySessions.slice(0, 6).map((s) => (
                <div
                  key={s.id}
                  className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-gray-900 truncate">
                        {s.className}
                      </p>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          SESSION_COLOR[s.status]
                        }`}
                      >
                        {SESSION_LABEL[s.status]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {s.subject ?? "Tanpa mata pelajaran"} · oleh{" "}
                      {s.createdByName} · {formatTime(s.createdAt)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">
                      {s.presentCount}/{s.totalCount}
                    </p>
                    <p className="text-xs text-gray-400">hadir</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ringkasan kehadiran hari ini */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-base font-bold text-gray-900">
            Status Kehadiran
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Akumulasi hari ini</p>

          {todayTotal === 0 ? (
            <div className="py-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                <BarChart3 size={20} className="text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">Belum ada data hari ini</p>
            </div>
          ) : (
            <div className="space-y-3 mt-4">
              {(["PRESENT", "LATE", "SICK", "PERMIT", "ABSENT"] as const).map(
                (st) => {
                  const count =
                    todayAttendances.find((a) => a.status === st)?.count ?? 0;
                  const pct =
                    todayTotal > 0 ? Math.round((count / todayTotal) * 100) : 0;
                  return (
                    <div key={st}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span
                          className={`font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[st]}`}
                        >
                          {STATUS_LABEL[st]}
                        </span>
                        <span className="text-gray-500">
                          <span className="font-bold text-gray-900">
                            {count}
                          </span>{" "}
                          · {pct}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            st === "PRESENT"
                              ? "bg-green-500"
                              : st === "LATE"
                              ? "bg-amber-500"
                              : st === "SICK"
                              ? "bg-blue-500"
                              : st === "PERMIT"
                              ? "bg-purple-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions + recent sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-base font-bold text-gray-900">Aksi Cepat</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Pintasan menuju fitur utama
          </p>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <QuickAction
              href="/admin/users"
              icon={UserPlus}
              label="Tambah Pengguna"
              color="bg-[#0d5c63]"
            />
            <QuickAction
              href="/admin/classes"
              icon={BookOpen}
              label="Kelola Kelas"
              color="bg-blue-600"
            />
            <QuickAction
              href="/admin/students"
              icon={GraduationCap}
              label="Data Siswa"
              color="bg-purple-600"
            />
            <QuickAction
              href="/admin/reports"
              icon={BarChart3}
              label="Lihat Laporan"
              color="bg-amber-500"
            />
            <QuickAction
              href="/documents"
              icon={FileSignature}
              label="Dokumen"
              color="bg-green-600"
            />
            <QuickAction
              href="/admin/settings"
              icon={CalendarDays}
              label="Pengaturan"
              color="bg-gray-700"
            />
          </div>
        </div>

        {/* Aktivitas terbaru */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Aktivitas Terbaru
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                6 sesi absensi terakhir
              </p>
            </div>
          </div>

          {recentSessions.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-gray-500">Belum ada aktivitas.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentSessions.map((s) => (
                <div
                  key={s.id}
                  className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#0d5c63] flex items-center justify-center shrink-0">
                    <QrCode size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {s.className}{" "}
                      <span className="font-normal text-gray-500">
                        · {s.subject ?? "Tanpa mapel"}
                      </span>
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {s.createdByName} · {formatDate(s.date)} ·{" "}
                      {s.attendanceCount} kehadiran
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      SESSION_COLOR[s.status]
                    }`}
                  >
                    {SESSION_LABEL[s.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  color,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-start gap-2 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
    >
      <div
        className={`w-8 h-8 rounded-lg ${color} text-white flex items-center justify-center group-hover:scale-105 transition-transform`}
      >
        <Icon size={16} />
      </div>
      <span className="text-xs font-semibold text-gray-700 group-hover:text-gray-900">
        {label}
      </span>
    </Link>
  );
}
