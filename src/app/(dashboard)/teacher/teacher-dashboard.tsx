"use client";

// src/app/(dashboard)/teacher/teacher-dashboard.tsx

import {
  GraduationCap,
  BookOpen,
  TrendingUp,
  QrCode,
  ChevronRight,
  Users,
} from "lucide-react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ─── Types ─── */

export type TeacherDashboardData = {
  userName: string;
  dateFormatted: string;
  totalClasses: number;
  totalMyStudents: number;
  todayRate: number;
  todayPresent: number;
  todayLate: number;
  todayAbsent: number;
  todayTotal: number;
  activeSessions: number;
  todaySessions: {
    id: string;
    status: string;
    subject: string | null;
    createdAt: string;
    className: string;
    presentCount: number;
    lateCount: number;
    absentCount: number;
    totalCount: number;
  }[];
  recentSessions: {
    id: string;
    status: string;
    subject: string | null;
    date: string;
    className: string;
    attendanceCount: number;
  }[];
  weeklyTrend: {
    date: string;
    label: string;
    present: number;
    absent: number;
    late: number;
    total: number;
    rate: number;
  }[];
  classes: {
    id: string;
    name: string;
    grade: string | null;
    studentCount: number;
  }[];
};

const SESSION_STATUS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "Aktif", color: "bg-green-50 text-green-600" },
  CLOSED: { label: "Ditutup", color: "bg-gray-100 text-gray-500" },
  EXPIRED: { label: "Kedaluwarsa", color: "bg-amber-50 text-amber-600" },
  CANCELLED: { label: "Dibatalkan", color: "bg-red-50 text-red-500" },
};

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatShortDate(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
  }).format(new Date(iso));
}

/* ─── Main ─── */

export function TeacherDashboard({ data }: { data: TeacherDashboardData }) {
  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Halo, {data.userName}! 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1">{data.dateFormatted}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={<BookOpen size={20} />}
          label="Kelas Saya"
          value={data.totalClasses}
          color="teal"
        />
        <SummaryCard
          icon={<GraduationCap size={20} />}
          label="Total Siswa"
          value={data.totalMyStudents}
          color="blue"
        />
        <SummaryCard
          icon={<TrendingUp size={20} />}
          label="Kehadiran Hari Ini"
          value={`${data.todayRate}%`}
          color={data.todayRate >= 80 ? "green" : data.todayRate >= 60 ? "amber" : "red"}
        />
        <SummaryCard
          icon={<QrCode size={20} />}
          label="Sesi Aktif"
          value={data.activeSessions}
          color="purple"
        />
      </div>

      {/* Today's Stats Bar */}
      {data.todayTotal > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Ringkasan Hari Ini</h3>
          <div className="flex items-center gap-4 mb-3">
            <StatPill label="Hadir" value={data.todayPresent} color="bg-teal-500" />
            <StatPill label="Terlambat" value={data.todayLate} color="bg-amber-500" />
            <StatPill label="Absen" value={data.todayAbsent} color="bg-red-500" />
            <StatPill
              label="Lainnya"
              value={data.todayTotal - data.todayPresent - data.todayLate - data.todayAbsent}
              color="bg-gray-400"
            />
          </div>
          {/* Progress bar */}
          <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden flex">
            {data.todayPresent > 0 && (
              <div
                className="h-full bg-teal-500 transition-all"
                style={{ width: `${(data.todayPresent / data.todayTotal) * 100}%` }}
              />
            )}
            {data.todayLate > 0 && (
              <div
                className="h-full bg-amber-500 transition-all"
                style={{ width: `${(data.todayLate / data.todayTotal) * 100}%` }}
              />
            )}
            {data.todayAbsent > 0 && (
              <div
                className="h-full bg-red-500 transition-all"
                style={{ width: `${(data.todayAbsent / data.todayTotal) * 100}%` }}
              />
            )}
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Today's Sessions */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Sesi Hari Ini</h3>
            <Link
              href="/teacher/attendance"
              className="text-xs font-medium text-[#0d5c63] hover:underline flex items-center gap-0.5"
            >
              Buat Sesi <ChevronRight size={12} />
            </Link>
          </div>

          {data.todaySessions.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {data.todaySessions.map((s) => {
                const cfg = SESSION_STATUS[s.status] ?? SESSION_STATUS.ACTIVE;
                return (
                  <div key={s.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-[#0d5c63]/10 flex items-center justify-center shrink-0">
                      <QrCode size={18} className="text-[#0d5c63]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">{s.className}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {s.subject ? `${s.subject} · ` : ""}{formatTime(s.createdAt)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900">{s.presentCount}/{s.totalCount}</p>
                      <p className="text-[10px] text-gray-400">hadir</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                <QrCode size={22} className="text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-400">Belum ada sesi hari ini</p>
              <Link
                href="/teacher/attendance"
                className="mt-2 text-xs font-medium text-[#0d5c63] hover:underline"
              >
                Buat sesi absensi →
              </Link>
            </div>
          )}
        </div>

        {/* My Classes */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Kelas Saya</h3>
          </div>

          {data.classes.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {data.classes.map((c) => (
                <div key={c.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <BookOpen size={16} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                    {c.grade && <p className="text-xs text-gray-400">Kelas {c.grade}</p>}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
                    <Users size={12} />
                    {c.studentCount}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-sm text-gray-400">Belum ada kelas yang ditugaskan</p>
            </div>
          )}
        </div>
      </div>

      {/* Weekly Trend Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-gray-400" />
          <h3 className="text-sm font-bold text-gray-900">Tren Kehadiran 7 Hari Terakhir</h3>
        </div>
        {data.weeklyTrend.some((d) => d.total > 0) ? (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.weeklyTrend}>
              <defs>
                <linearGradient id="tGradPresent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="tGradAbsent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #e5e7eb" }}
                labelFormatter={(label) => `${label}`}
              />
              <Area
                type="monotone"
                dataKey="present"
                name="Hadir"
                stroke="#0d9488"
                fill="url(#tGradPresent)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="absent"
                name="Absen"
                stroke="#ef4444"
                fill="url(#tGradAbsent)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="late"
                name="Terlambat"
                stroke="#f59e0b"
                fill="transparent"
                strokeWidth={2}
                strokeDasharray="4 4"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[240px] flex items-center justify-center text-sm text-gray-400">
            Belum ada data minggu ini
          </div>
        )}
      </div>

      {/* Recent Sessions */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">Sesi Terakhir</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left font-semibold text-gray-500 px-5 py-3">Kelas</th>
                <th className="text-left font-semibold text-gray-500 px-3 py-3">Mata Pelajaran</th>
                <th className="text-center font-semibold text-gray-500 px-3 py-3">Kehadiran</th>
                <th className="text-center font-semibold text-gray-500 px-3 py-3">Status</th>
                <th className="text-left font-semibold text-gray-500 px-3 py-3">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.recentSessions.map((s) => {
                const cfg = SESSION_STATUS[s.status] ?? SESSION_STATUS.ACTIVE;
                return (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3 font-semibold text-gray-900">{s.className}</td>
                    <td className="px-3 py-3 text-gray-600">{s.subject || "-"}</td>
                    <td className="px-3 py-3 text-center font-medium text-gray-900">{s.attendanceCount}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500">{formatShortDate(s.date)}</td>
                  </tr>
                );
              })}
              {data.recentSessions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-400">
                    Belum ada riwayat sesi
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── Helper Components ─── */

function SummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: "teal" | "blue" | "purple" | "green" | "amber" | "red";
}) {
  const colors: Record<string, { icon: string }> = {
    teal:   { icon: "bg-[#0d5c63] text-white" },
    blue:   { icon: "bg-blue-600 text-white" },
    purple: { icon: "bg-purple-600 text-white" },
    green:  { icon: "bg-green-600 text-white" },
    amber:  { icon: "bg-amber-500 text-white" },
    red:    { icon: "bg-red-500 text-white" },
  };
  const c = colors[color];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${c.icon} flex items-center justify-center shrink-0`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-400 truncate">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  if (value === 0) return null;
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <span className="text-xs text-gray-600">
        <span className="font-bold">{value}</span> {label}
      </span>
    </div>
  );
}
