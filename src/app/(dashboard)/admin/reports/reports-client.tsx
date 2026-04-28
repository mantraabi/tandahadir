"use client";

// src/app/(dashboard)/admin/reports/reports-client.tsx

import { useState, useTransition } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  GraduationCap,
  Download,
  Filter,
  Loader2,
  ClipboardList,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import * as XLSX from "xlsx";
import { getReportData, type ReportData, type ReportFilters } from "./actions";

type ClassOption = { id: string; name: string };

type Props = {
  initialData: ReportData;
  classes: ClassOption[];
};

const PIE_COLORS = ["#0d9488", "#ef4444", "#f59e0b", "#6366f1", "#8b5cf6"];

export function ReportsClient({ initialData, classes }: Props) {
  const [data, setData] = useState<ReportData>(initialData);
  const [classId, setClassId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isPending, startTransition] = useTransition();

  function applyFilter() {
    const filters: ReportFilters = {};
    if (classId) filters.classId = classId;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    startTransition(async () => {
      const result = await getReportData(filters);
      setData(result);
    });
  }

  function resetFilter() {
    setClassId("");
    setStartDate("");
    setEndDate("");
    startTransition(async () => {
      const result = await getReportData({});
      setData(result);
    });
  }

  function exportToExcel() {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryRows = [
      ["Laporan Kehadiran"],
      [""],
      ["Total Kelas", data.summary.totalClasses],
      ["Total Siswa Aktif", data.summary.totalStudents],
      ["Total Sesi", data.summary.totalSessions],
      ["Total Kehadiran", data.summary.totalAttendances],
      ["Rata-rata Kehadiran", `${data.summary.overallRate}%`],
      [""],
      ["Status", "Jumlah", "Persentase"],
      ["Hadir", data.statusSummary.present, data.statusSummary.total > 0 ? `${Math.round(data.statusSummary.present / data.statusSummary.total * 100)}%` : "0%"],
      ["Absen", data.statusSummary.absent, data.statusSummary.total > 0 ? `${Math.round(data.statusSummary.absent / data.statusSummary.total * 100)}%` : "0%"],
      ["Terlambat", data.statusSummary.late, data.statusSummary.total > 0 ? `${Math.round(data.statusSummary.late / data.statusSummary.total * 100)}%` : "0%"],
      ["Sakit", data.statusSummary.sick, data.statusSummary.total > 0 ? `${Math.round(data.statusSummary.sick / data.statusSummary.total * 100)}%` : "0%"],
      ["Izin", data.statusSummary.permit, data.statusSummary.total > 0 ? `${Math.round(data.statusSummary.permit / data.statusSummary.total * 100)}%` : "0%"],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan");

    // Sheet 2: Per Class
    const classHeaders = ["Kelas", "Jumlah Siswa", "Sesi", "Hadir", "Absen", "Terlambat", "Sakit", "Izin", "Tingkat Kehadiran"];
    const classRows = data.classAttendance.map((c) => [
      c.className, c.totalStudents, c.totalSessions,
      c.present, c.absent, c.late, c.sick, c.permit, `${c.rate}%`,
    ]);
    const wsClass = XLSX.utils.aoa_to_sheet([classHeaders, ...classRows]);
    wsClass["!cols"] = classHeaders.map(() => ({ wch: 16 }));
    XLSX.utils.book_append_sheet(wb, wsClass, "Per Kelas");

    // Sheet 3: Daily Trend
    if (data.dailyTrend.length > 0) {
      const trendHeaders = ["Tanggal", "Hadir", "Absen", "Terlambat", "Sakit", "Izin", "Total", "Tingkat Kehadiran"];
      const trendRows = data.dailyTrend.map((d) => [
        d.date, d.present, d.absent, d.late, d.sick, d.permit, d.total, `${d.rate}%`,
      ]);
      const wsTrend = XLSX.utils.aoa_to_sheet([trendHeaders, ...trendRows]);
      wsTrend["!cols"] = trendHeaders.map(() => ({ wch: 16 }));
      XLSX.utils.book_append_sheet(wb, wsTrend, "Tren Harian");
    }

    XLSX.writeFile(wb, `laporan_kehadiran_${new Date().toISOString().split("T")[0]}.xlsx`);
  }

  const pieData = [
    { name: "Hadir", value: data.statusSummary.present },
    { name: "Absen", value: data.statusSummary.absent },
    { name: "Terlambat", value: data.statusSummary.late },
    { name: "Sakit", value: data.statusSummary.sick },
    { name: "Izin", value: data.statusSummary.permit },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Kehadiran</h1>
          <p className="text-sm text-gray-500 mt-1">
            Ringkasan dan analisis data kehadiran siswa
          </p>
        </div>
        <button
          onClick={exportToExcel}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0d5c63] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a50] transition-colors"
        >
          <Download size={16} />
          Export Excel
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Kelas</label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
            >
              <option value="">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={applyFilter}
              disabled={isPending}
              className="px-4 py-2 rounded-lg bg-[#0d5c63] text-white text-sm font-semibold hover:bg-[#0a4a50] transition-colors disabled:opacity-60 flex items-center gap-1.5"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Filter size={14} />}
              Filter
            </button>
            <button
              onClick={resetFilter}
              disabled={isPending}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={<GraduationCap size={20} />}
          label="Total Siswa Aktif"
          value={data.summary.totalStudents}
          color="teal"
        />
        <SummaryCard
          icon={<ClipboardList size={20} />}
          label="Total Sesi"
          value={data.summary.totalSessions}
          color="blue"
        />
        <SummaryCard
          icon={<Users size={20} />}
          label="Total Kehadiran"
          value={data.summary.totalAttendances}
          color="purple"
        />
        <SummaryCard
          icon={<TrendingUp size={20} />}
          label="Rata-rata Hadir"
          value={`${data.summary.overallRate}%`}
          color={data.summary.overallRate >= 80 ? "green" : data.summary.overallRate >= 60 ? "amber" : "red"}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pie Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon size={16} className="text-gray-400" />
            <h3 className="text-sm font-bold text-gray-900">Distribusi Status</h3>
          </div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [value, ""]}
                  contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #e5e7eb" }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-sm text-gray-400">
              Belum ada data
            </div>
          )}
        </div>

        {/* Bar Chart - Per Class */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-gray-400" />
            <h3 className="text-sm font-bold text-gray-900">Kehadiran per Kelas</h3>
          </div>
          {data.classAttendance.some((c) => c.totalSessions > 0) ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.classAttendance} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="className"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                <Tooltip
                  formatter={(value) => [`${value}%`, "Kehadiran"]}
                  contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #e5e7eb" }}
                />
                <Bar dataKey="rate" fill="#0d9488" radius={[4, 4, 0, 0]} name="Kehadiran" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-sm text-gray-400">
              Belum ada data sesi kehadiran
            </div>
          )}
        </div>
      </div>

      {/* Area Chart - Daily Trend */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-gray-400" />
          <h3 className="text-sm font-bold text-gray-900">Tren Kehadiran Harian</h3>
        </div>
        {data.dailyTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.dailyTrend}>
              <defs>
                <linearGradient id="gradPresent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradAbsent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #e5e7eb" }}
                labelFormatter={(label) => `Tanggal: ${label}`}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Area
                type="monotone"
                dataKey="present"
                name="Hadir"
                stroke="#0d9488"
                fill="url(#gradPresent)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="absent"
                name="Absen"
                stroke="#ef4444"
                fill="url(#gradAbsent)"
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
          <div className="h-[280px] flex items-center justify-center text-sm text-gray-400">
            Belum ada data tren harian
          </div>
        )}
      </div>

      {/* Detail Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">Detail per Kelas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left font-semibold text-gray-500 px-5 py-3">Kelas</th>
                <th className="text-center font-semibold text-gray-500 px-3 py-3">Siswa</th>
                <th className="text-center font-semibold text-gray-500 px-3 py-3">Sesi</th>
                <th className="text-center font-semibold text-gray-500 px-3 py-3">
                  <span className="text-teal-600">Hadir</span>
                </th>
                <th className="text-center font-semibold text-gray-500 px-3 py-3">
                  <span className="text-red-500">Absen</span>
                </th>
                <th className="text-center font-semibold text-gray-500 px-3 py-3">
                  <span className="text-amber-500">Terlambat</span>
                </th>
                <th className="text-center font-semibold text-gray-500 px-3 py-3">
                  <span className="text-indigo-500">Sakit</span>
                </th>
                <th className="text-center font-semibold text-gray-500 px-3 py-3">
                  <span className="text-purple-500">Izin</span>
                </th>
                <th className="text-center font-semibold text-gray-500 px-3 py-3">Tingkat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.classAttendance.map((c) => (
                <tr key={c.classId} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3 font-semibold text-gray-900">{c.className}</td>
                  <td className="px-3 py-3 text-center text-gray-600">{c.totalStudents}</td>
                  <td className="px-3 py-3 text-center text-gray-600">{c.totalSessions}</td>
                  <td className="px-3 py-3 text-center font-medium text-teal-600">{c.present}</td>
                  <td className="px-3 py-3 text-center font-medium text-red-500">{c.absent}</td>
                  <td className="px-3 py-3 text-center font-medium text-amber-500">{c.late}</td>
                  <td className="px-3 py-3 text-center font-medium text-indigo-500">{c.sick}</td>
                  <td className="px-3 py-3 text-center font-medium text-purple-500">{c.permit}</td>
                  <td className="px-3 py-3 text-center">
                    <RateBadge rate={c.rate} />
                  </td>
                </tr>
              ))}
              {data.classAttendance.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-gray-400 text-sm">
                    Belum ada data kelas
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
  const colors: Record<string, { bg: string; icon: string }> = {
    teal:   { bg: "bg-teal-50",   icon: "bg-[#0d5c63] text-white" },
    blue:   { bg: "bg-blue-50",   icon: "bg-blue-600 text-white" },
    purple: { bg: "bg-purple-50", icon: "bg-purple-600 text-white" },
    green:  { bg: "bg-green-50",  icon: "bg-green-600 text-white" },
    amber:  { bg: "bg-amber-50",  icon: "bg-amber-500 text-white" },
    red:    { bg: "bg-red-50",    icon: "bg-red-500 text-white" },
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

function RateBadge({ rate }: { rate: number }) {
  const color =
    rate >= 80
      ? "bg-green-50 text-green-600"
      : rate >= 60
      ? "bg-amber-50 text-amber-600"
      : "bg-red-50 text-red-500";

  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${color}`}>
      {rate}%
    </span>
  );
}
