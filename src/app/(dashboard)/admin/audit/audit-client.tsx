"use client";

// src/app/(dashboard)/admin/audit/audit-client.tsx

import { useState, useTransition } from "react";
import {
  Shield,
  Search,
  Filter,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  X,
  MapPin,
  Smartphone,
  Globe,
  Clock,
  Users,
} from "lucide-react";
import { getAuditLogs, type AuditFilters, type AuditResult, type AuditRow } from "./actions";

type ClassOption = { id: string; name: string };

type Props = {
  initialResult: AuditResult;
  classes: ClassOption[];
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PRESENT: { label: "Hadir", color: "bg-teal-50 text-teal-600" },
  LATE: { label: "Terlambat", color: "bg-amber-50 text-amber-600" },
  ABSENT: { label: "Absen", color: "bg-red-50 text-red-500" },
  SICK: { label: "Sakit", color: "bg-indigo-50 text-indigo-600" },
  PERMIT: { label: "Izin", color: "bg-purple-50 text-purple-600" },
};

export function AuditClient({ initialResult, classes }: Props) {
  const [result, setResult] = useState<AuditResult>(initialResult);
  const [classId, setClassId] = useState("");
  const [studentQuery, setStudentQuery] = useState("");
  const [status, setStatus] = useState("");
  const [method, setMethod] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [suspiciousOnly, setSuspiciousOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<AuditRow | null>(null);
  const [isPending, startTransition] = useTransition();

  function load(p = 1) {
    const filters: AuditFilters = { page: p, perPage: 25 };
    if (classId) filters.classId = classId;
    if (studentQuery.trim()) filters.studentQuery = studentQuery.trim();
    if (status) filters.status = status;
    if (method) filters.method = method;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (suspiciousOnly) filters.suspiciousOnly = true;

    startTransition(async () => {
      const r = await getAuditLogs(filters);
      setResult(r);
      setPage(p);
    });
  }

  function reset() {
    setClassId("");
    setStudentQuery("");
    setStatus("");
    setMethod("");
    setStartDate("");
    setEndDate("");
    setSuspiciousOnly(false);
    startTransition(async () => {
      const r = await getAuditLogs({ page: 1, perPage: 25 });
      setResult(r);
      setPage(1);
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield size={22} className="text-[#0d5c63]" />
            Audit Log Kehadiran
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Jejak audit untuk investigasi titip absen — cek IP, perangkat, akurasi GPS
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSuspiciousOnly((v) => !v);
              setTimeout(() => load(1), 0);
            }}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors border ${
              suspiciousOnly
                ? "bg-red-50 text-red-600 border-red-200"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            <AlertTriangle size={14} />
            {suspiciousOnly ? "Hanya Mencurigakan" : "Tampilkan Semua"}
            {result.suspiciousTotal > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                {result.suspiciousTotal}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Cari Siswa (Nama / NIS)</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={studentQuery}
                onChange={(e) => setStudentQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load(1)}
                placeholder="cth. Budi atau 12345"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Kelas</label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
            >
              <option value="">Semua</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
            >
              <option value="">Semua</option>
              <option value="PRESENT">Hadir</option>
              <option value="LATE">Terlambat</option>
              <option value="ABSENT">Absen</option>
              <option value="SICK">Sakit</option>
              <option value="PERMIT">Izin</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Metode</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
            >
              <option value="">Semua</option>
              <option value="QR">Scan QR</option>
              <option value="MANUAL">Manual</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Dari Tanggal</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Sampai Tanggal</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={reset}
            disabled={isPending}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60"
          >
            Reset
          </button>
          <button
            onClick={() => load(1)}
            disabled={isPending}
            className="px-4 py-2 rounded-lg bg-[#0d5c63] text-white text-sm font-semibold hover:bg-[#0a4a50] transition-colors disabled:opacity-60 inline-flex items-center gap-1.5"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Filter size={14} />}
            Terapkan
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <SummaryCard label="Total Baris (filter)" value={result.total} icon={<Users size={16} />} color="teal" />
        <SummaryCard
          label="Mencurigakan"
          value={result.suspiciousTotal}
          icon={<AlertTriangle size={16} />}
          color={result.suspiciousTotal > 0 ? "red" : "gray"}
        />
        <SummaryCard label="Halaman" value={`${result.page} / ${result.totalPages}`} icon={<Filter size={16} />} color="gray" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-xs text-gray-500">
                <th className="text-left font-semibold px-4 py-3">Tanggal</th>
                <th className="text-left font-semibold px-3 py-3">Kelas</th>
                <th className="text-left font-semibold px-3 py-3">Siswa</th>
                <th className="text-left font-semibold px-3 py-3">Status</th>
                <th className="text-left font-semibold px-3 py-3">Metode</th>
                <th className="text-left font-semibold px-3 py-3">Jam</th>
                <th className="text-left font-semibold px-3 py-3">IP</th>
                <th className="text-left font-semibold px-3 py-3">Akurasi</th>
                <th className="text-center font-semibold px-3 py-3">Tanda</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {result.rows.map((r) => {
                const sCfg = STATUS_LABEL[r.status];
                return (
                  <tr
                    key={r.id}
                    onClick={() => setDetail(r)}
                    className={`cursor-pointer transition-colors ${
                      r.isSuspicious ? "bg-red-50/40 hover:bg-red-50/70" : "hover:bg-gray-50/50"
                    }`}
                  >
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{r.date}</td>
                    <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{r.className}</td>
                    <td className="px-3 py-3 text-gray-900 font-medium">
                      <div>{r.studentName}</div>
                      {r.studentNis && <div className="text-[10px] text-gray-400">NIS: {r.studentNis}</div>}
                    </td>
                    <td className="px-3 py-3">
                      {sCfg && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sCfg.color}`}>
                          {sCfg.label}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-gray-600 text-xs">
                      {r.method === "QR" ? "Scan QR" : "Manual"}
                    </td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{r.checkInAt ?? "-"}</td>
                    <td className="px-3 py-3 text-gray-500 font-mono text-xs whitespace-nowrap">
                      {r.ipAddress ?? "-"}
                    </td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">
                      {r.accuracy != null ? `±${Math.round(r.accuracy)} m` : "-"}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {r.isSuspicious ? (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white"
                          title={`Perangkat dipakai oleh ${r.duplicateCount + 1} siswa`}
                        >
                          <AlertTriangle size={10} />
                          {r.duplicateCount + 1}x
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-300">OK</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {result.rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-400">
                    Tidak ada data audit untuk filter ini
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {result.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500">
              Menampilkan halaman {result.page} dari {result.totalPages} ({result.total} baris)
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={result.page <= 1 || isPending}
                onClick={() => load(result.page - 1)}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                disabled={result.page >= result.totalPages || isPending}
                onClick={() => load(result.page + 1)}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detail && <DetailModal row={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

/* ─── Helpers ─── */

function SummaryCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: "teal" | "red" | "gray";
}) {
  const colors = {
    teal: { bg: "bg-teal-50", icon: "bg-[#0d5c63] text-white" },
    red: { bg: "bg-red-50", icon: "bg-red-500 text-white" },
    gray: { bg: "bg-gray-50", icon: "bg-gray-400 text-white" },
  } as const;
  const c = colors[color];
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 p-4`}>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl ${c.icon} flex items-center justify-center shrink-0`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-xs text-gray-400 truncate">{label}</p>
          <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function DetailModal({ row, onClose }: { row: AuditRow; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Shield size={18} className="text-[#0d5c63]" />
            Detail Audit
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          {row.isSuspicious && (
            <div className="rounded-xl bg-red-50 border border-red-100 p-3 flex items-start gap-2">
              <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-700">Perangkat Bersama</p>
                <p className="text-xs text-red-600">
                  Device hash ini terpakai oleh <strong>{row.duplicateCount + 1}</strong> siswa berbeda.
                  Kemungkinan titip absen — tinjau dengan guru terkait.
                </p>
              </div>
            </div>
          )}
          <Field label="Tanggal" value={row.date} />
          <Field label="Kelas" value={row.className} />
          {row.subject && <Field label="Mata Pelajaran" value={row.subject} />}
          <Field label="Siswa" value={`${row.studentName}${row.studentNis ? ` (NIS: ${row.studentNis})` : ""}`} />
          <Field label="Status" value={STATUS_LABEL[row.status]?.label ?? row.status} />
          <Field label="Metode" value={row.method === "QR" ? "Scan QR" : "Manual"} />
          {row.checkInAt && <Field label="Jam Hadir" value={row.checkInAt} icon={<Clock size={14} />} />}
          {row.ipAddress && <Field label="IP Address" value={row.ipAddress} icon={<Globe size={14} />} mono />}
          {row.accuracy != null && (
            <Field label="Akurasi GPS" value={`±${Math.round(row.accuracy)} meter`} icon={<MapPin size={14} />} />
          )}
          {row.deviceHash && (
            <Field
              label="Device Hash"
              value={row.deviceHash.slice(0, 16) + "…"}
              icon={<Smartphone size={14} />}
              mono
            />
          )}
          {row.deviceInfo && <Field label="User Agent" value={row.deviceInfo} mono small />}
        </div>
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-lg bg-[#0d5c63] text-white text-sm font-semibold hover:bg-[#0a4a50] transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  icon,
  mono,
  small,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  mono?: boolean;
  small?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="w-32 shrink-0 text-xs text-gray-400 flex items-center gap-1.5 pt-0.5">
        {icon}
        {label}
      </div>
      <div
        className={`flex-1 text-gray-800 break-all ${mono ? "font-mono" : ""} ${small ? "text-[11px]" : "text-sm"}`}
      >
        {value}
      </div>
    </div>
  );
}
