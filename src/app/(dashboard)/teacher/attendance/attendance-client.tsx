"use client";

// src/app/(dashboard)/teacher/attendance/attendance-client.tsx

import { useState, useTransition, useEffect } from "react";
import {
  QrCode,
  Plus,
  X,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  StopCircle,
  Search,
  UserX,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Users,
  Trash2,
  Copy,
  ExternalLink,
  Check,
} from "lucide-react";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import {
  createAttendanceSession,
  closeSession,
  cancelSession,
  markAttendance,
  markAllAbsent,
  getSessionDetail,
  deleteSession,
} from "./actions";

/* ─── Types ─── */

export type SessionItem = {
  id: string;
  classId: string;
  className: string;
  date: string;
  subject: string | null;
  qrCode: string;
  qrExpiresAt: string;
  status: string;
  createdAt: string;
  presentCount: number;
  totalCount: number;
  studentCount: number;
};

export type ClassOption = {
  id: string;
  name: string;
  studentCount: number;
};

type SessionDetail = {
  id: string;
  classId: string;
  className: string;
  date: string;
  subject: string | null;
  qrCode: string;
  qrExpiresAt: string;
  status: string;
  createdAt: string;
  students: { id: string; name: string; nisn: string | null; nis: string | null }[];
  attendances: {
    id: string;
    studentId: string;
    studentName: string;
    status: string;
    method: string;
    checkInAt: string;
  }[];
};

type Props = {
  sessions: SessionItem[];
  classes: ClassOption[];
};

/* ─── Constants ─── */

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  ACTIVE: { label: "Aktif", color: "bg-green-50 text-green-600", icon: <CheckCircle2 size={12} /> },
  CLOSED: { label: "Ditutup", color: "bg-gray-100 text-gray-500", icon: <StopCircle size={12} /> },
  EXPIRED: { label: "Kedaluwarsa", color: "bg-amber-50 text-amber-600", icon: <Clock size={12} /> },
  CANCELLED: { label: "Dibatalkan", color: "bg-red-50 text-red-500", icon: <XCircle size={12} /> },
};

const ATTEND_STATUS: Record<string, { label: string; color: string }> = {
  PRESENT: { label: "Hadir", color: "bg-teal-50 text-teal-600" },
  ABSENT: { label: "Absen", color: "bg-red-50 text-red-500" },
  LATE: { label: "Terlambat", color: "bg-amber-50 text-amber-600" },
  SICK: { label: "Sakit", color: "bg-indigo-50 text-indigo-600" },
  PERMIT: { label: "Izin", color: "bg-purple-50 text-purple-600" },
};

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));
}

/* ─── Main Component ─── */

export function AttendanceClient({ sessions, classes }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [detailSession, setDetailSession] = useState<SessionDetail | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 10;

  const filtered = sessions.filter((s) => {
    const matchSearch =
      s.className.toLowerCase().includes(search.toLowerCase()) ||
      (s.subject ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const activeSessions = sessions.filter((s) => s.status === "ACTIVE").length;

  async function openDetail(sessionId: string) {
    setLoadingDetail(true);
    try {
      const detail = await getSessionDetail(sessionId);
      if (detail) setDetailSession(detail);
      else toast.error("Sesi tidak ditemukan");
    } catch {
      toast.error("Gagal memuat detail");
    }
    setLoadingDetail(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Absensi</h1>
          <p className="text-sm text-gray-500 mt-1">
            {sessions.length} sesi · {activeSessions} aktif
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0d5c63] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a50] transition-colors"
        >
          <Plus size={16} />
          Buat Sesi Baru
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["ACTIVE", "CLOSED", "EXPIRED", "CANCELLED"] as const).map((s) => {
          const cfg = STATUS_CONFIG[s];
          const count = sessions.filter((x) => x.status === s).length;
          return (
            <button
              key={s}
              onClick={() => { setStatusFilter(statusFilter === s ? "ALL" : s); setPage(1); }}
              className={`rounded-xl border p-3 text-left transition-all ${
                statusFilter === s
                  ? "border-[#0d5c63] bg-[#0d5c63]/5"
                  : "border-gray-100 bg-white hover:border-gray-200"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {cfg.icon}
                <span className="text-xs font-medium text-gray-500">{cfg.label}</span>
              </div>
              <p className="text-lg font-bold text-gray-900">{count}</p>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Cari kelas atau mata pelajaran..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
          />
        </div>
      </div>

      {/* Sessions List */}
      <div className="space-y-3">
        {paginated.map((s) => {
          const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.ACTIVE;
          const rate = s.studentCount > 0 ? Math.round((s.presentCount / s.studentCount) * 100) : 0;
          return (
            <div
              key={s.id}
              className="bg-white rounded-2xl border border-gray-100 p-4 hover:border-gray-200 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#0d5c63]/10 flex items-center justify-center shrink-0">
                  <QrCode size={22} className="text-[#0d5c63]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-gray-900">{s.className}</p>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>
                      {cfg.icon}
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {s.subject ? `${s.subject} · ` : ""}
                    {formatDate(s.date)} · {formatTime(s.createdAt)}
                  </p>
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  <p className="text-sm font-bold text-gray-900">{s.presentCount}/{s.studentCount}</p>
                  <p className="text-[10px] text-gray-400">{rate}% hadir</p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => openDetail(s.id)}
                    disabled={loadingDetail}
                    className="p-2 rounded-lg text-gray-400 hover:text-[#0d5c63] hover:bg-[#0d5c63]/5 transition-colors"
                    title="Detail"
                  >
                    {loadingDetail ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                  </button>
                  <button
                    onClick={() => setDeleteId(s.id)}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Hapus"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {paginated.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
            <QrCode size={36} className="mx-auto text-gray-200 mb-3" />
            <p className="text-sm font-medium text-gray-400">Belum ada sesi absensi</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-2 text-xs font-medium text-[#0d5c63] hover:underline"
            >
              Buat sesi pertama →
            </button>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">Halaman {page} dari {totalPages}</p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                p === "..." ? (
                  <span key={`d-${idx}`} className="px-2 text-xs text-gray-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                      page === p ? "bg-[#0d5c63] text-white" : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateSessionModal classes={classes} onClose={() => setShowCreate(false)} />
      )}
      {detailSession && (
        <SessionDetailModal
          session={detailSession}
          onClose={() => setDetailSession(null)}
        />
      )}
      {deleteId && (
        <DeleteSessionModal id={deleteId} onClose={() => setDeleteId(null)} />
      )}
    </div>
  );
}

/* ─── Create Session Modal ─── */

function CreateSessionModal({ classes, onClose }: { classes: ClassOption[]; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createAttendanceSession(formData);
      if (result.success) {
        toast.success("Sesi absensi berhasil dibuat");
        onClose();
      } else {
        setError(result.error ?? "Terjadi kesalahan");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Buat Sesi Absensi</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Kelas *</label>
            <select
              name="classId"
              required
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
            >
              <option value="">Pilih kelas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.studentCount} siswa)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mata Pelajaran</label>
            <input
              name="subject"
              placeholder="Contoh: Matematika (opsional)"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Durasi QR (menit)</label>
            <select
              name="duration"
              defaultValue="30"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
            >
              <option value="15">15 menit</option>
              <option value="30">30 menit</option>
              <option value="45">45 menit</option>
              <option value="60">60 menit</option>
              <option value="120">2 jam</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">QR code akan kedaluwarsa setelah durasi ini</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 rounded-lg bg-[#0d5c63] text-white text-sm font-semibold hover:bg-[#0a4a50] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <QrCode size={14} />}
              Buat Sesi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Session Detail Modal ─── */

function SessionDetailModal({ session, onClose }: { session: SessionDetail; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<"qr" | "attendance">("attendance");
  const [studentSearch, setStudentSearch] = useState("");

  const cfg = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.ACTIVE;
  const isActive = session.status === "ACTIVE";
  const isExpired = new Date(session.qrExpiresAt) < new Date();

  // Build attendance map
  const attendanceMap = new Map(session.attendances.map((a) => [a.studentId, a]));

  // Filter students
  const filteredStudents = session.students.filter((s) =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    (s.nisn ?? "").includes(studentSearch) ||
    (s.nis ?? "").includes(studentSearch)
  );

  const presentCount = session.attendances.filter((a) => a.status === "PRESENT").length;
  const lateCount = session.attendances.filter((a) => a.status === "LATE").length;
  const absentCount = session.attendances.filter((a) => a.status === "ABSENT").length;
  const sickCount = session.attendances.filter((a) => a.status === "SICK").length;
  const permitCount = session.attendances.filter((a) => a.status === "PERMIT").length;

  function handleClose() {
    startTransition(async () => {
      const result = await closeSession(session.id);
      if (result.success) {
        toast.success("Sesi ditutup");
        onClose();
      } else {
        toast.error(result.error ?? "Gagal");
      }
    });
  }

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelSession(session.id);
      if (result.success) {
        toast.success("Sesi dibatalkan");
        onClose();
      } else {
        toast.error(result.error ?? "Gagal");
      }
    });
  }

  function handleMarkAll() {
    startTransition(async () => {
      const result = await markAllAbsent(session.id);
      if (result.success) {
        toast.success(`${result.data?.count ?? 0} siswa ditandai absen`);
        onClose();
      } else {
        toast.error(result.error ?? "Gagal");
      }
    });
  }

  function handleMark(studentId: string, status: string) {
    startTransition(async () => {
      const result = await markAttendance(session.id, studentId, status);
      if (result.success) {
        toast.success("Kehadiran dicatat");
        // Refresh detail
        const detail = await getSessionDetail(session.id);
        if (detail) {
          session.attendances = detail.attendances;
        }
        onClose();
      } else {
        toast.error(result.error ?? "Gagal");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">{session.className}</h2>
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>
                {cfg.icon}
                {cfg.label}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {session.subject ? `${session.subject} · ` : ""}
              {formatDate(session.date)} · {formatTime(session.createdAt)}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Stats bar */}
        <div className="px-6 py-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-4 flex-wrap text-xs">
            <StatBadge label="Hadir" count={presentCount} color="bg-teal-500" />
            <StatBadge label="Terlambat" count={lateCount} color="bg-amber-500" />
            <StatBadge label="Absen" count={absentCount} color="bg-red-500" />
            <StatBadge label="Sakit" count={sickCount} color="bg-indigo-500" />
            <StatBadge label="Izin" count={permitCount} color="bg-purple-500" />
            <span className="text-gray-300">|</span>
            <span className="text-gray-500">
              <span className="font-bold text-gray-700">{session.attendances.length}</span>/{session.students.length} tercatat
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-3 shrink-0 flex gap-1">
          <button
            onClick={() => setTab("attendance")}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
              tab === "attendance" ? "bg-gray-50 text-gray-900 border border-b-0 border-gray-200" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Users size={14} className="inline mr-1.5" />
            Kehadiran
          </button>
          {isActive && (
            <button
              onClick={() => setTab("qr")}
              className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                tab === "qr" ? "bg-gray-50 text-gray-900 border border-b-0 border-gray-200" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <QrCode size={14} className="inline mr-1.5" />
              QR Code
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {tab === "qr" && isActive && (
            <ScanQrTab session={session} isExpired={isExpired} />
          )}

          {tab === "attendance" && (
            <div className="p-4 space-y-3">
              {/* Search + actions */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Cari siswa..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-xs outline-none focus:border-[#0d5c63] focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
                  />
                </div>
                {(isActive || session.status === "CLOSED") && (
                  <button
                    onClick={handleMarkAll}
                    disabled={isPending}
                    className="px-3 py-2 rounded-lg border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60 shrink-0"
                    title="Tandai semua yang belum tercatat sebagai Absen"
                  >
                    <UserX size={13} className="inline mr-1" />
                    Absenkan Sisa
                  </button>
                )}
              </div>

              {/* Student list */}
              <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50">
                {filteredStudents.map((student) => {
                  const att = attendanceMap.get(student.id);
                  const attCfg = att ? ATTEND_STATUS[att.status] : null;

                  return (
                    <div key={student.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{student.name}</p>
                        <p className="text-[10px] text-gray-400">
                          {student.nis ? `NIS: ${student.nis}` : student.nisn ? `NISN: ${student.nisn}` : ""}
                        </p>
                      </div>

                      {att && attCfg ? (
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${attCfg.color}`}>
                            {attCfg.label}
                          </span>
                          <span className="text-[10px] text-gray-300">
                            {att.method === "QR" ? "QR" : att.method === "MANUAL" ? "Manual" : att.method}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-300">Belum</span>
                      )}

                      {/* Manual mark buttons */}
                      {(isActive || session.status === "CLOSED") && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          {(["PRESENT", "LATE", "ABSENT", "SICK", "PERMIT"] as const).map((s) => {
                            const isCurrentStatus = att?.status === s;
                            return (
                              <button
                                key={s}
                                onClick={() => handleMark(student.id, s)}
                                disabled={isPending || isCurrentStatus}
                                title={ATTEND_STATUS[s].label}
                                className={`w-6 h-6 rounded text-[9px] font-bold transition-colors disabled:opacity-40 ${
                                  isCurrentStatus
                                    ? ATTEND_STATUS[s].color
                                    : "text-gray-400 hover:bg-gray-100"
                                }`}
                              >
                                {s[0]}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredStudents.length === 0 && (
                  <div className="px-4 py-8 text-center text-xs text-gray-400">
                    Tidak ada siswa ditemukan
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Tutup
          </button>
          {isActive && (
            <>
              <button
                onClick={handleCancel}
                disabled={isPending}
                className="py-2.5 px-4 rounded-lg border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
              >
                Batalkan
              </button>
              <button
                onClick={handleClose}
                disabled={isPending}
                className="flex-1 py-2.5 rounded-lg bg-[#0d5c63] text-white text-sm font-semibold hover:bg-[#0a4a50] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <StopCircle size={14} />}
                Tutup Sesi
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Scan QR Tab ─── */

function ScanQrTab({ session, isExpired }: { session: SessionDetail; isExpired: boolean }) {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  // Compute origin after mount (avoids SSR mismatch)
  useEffect(() => {
    const envUrl = process.env.NEXT_PUBLIC_APP_URL;
    setOrigin(envUrl ?? window.location.origin);
  }, []);

  const scanUrl = origin ? `${origin}/scan/${session.qrCode}` : `/scan/${session.qrCode}`;
  const isLocalhost = origin.includes("localhost") || origin.includes("127.0.0.1");

  function handleCopy() {
    navigator.clipboard.writeText(scanUrl).then(() => {
      setCopied(true);
      toast.success("URL disalin");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="p-6 flex flex-col items-center">
      <div className="bg-white border-2 border-gray-100 rounded-2xl p-6 inline-block">
        <QRCode value={scanUrl} size={220} level="H" />
      </div>

      <p className="text-xs text-gray-400 mt-3">
        {isExpired ? (
          <span className="text-red-500 font-medium">QR kedaluwarsa</span>
        ) : (
          <>Berlaku sampai {formatTime(session.qrExpiresAt)}</>
        )}
      </p>

      {/* URL display + actions */}
      <div className="w-full max-w-sm mt-4 space-y-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50">
          <p className="flex-1 text-[11px] text-gray-600 font-mono truncate">{scanUrl}</p>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded text-gray-400 hover:text-[#0d5c63] hover:bg-white transition-colors shrink-0"
            title="Salin URL"
          >
            {copied ? <Check size={14} className="text-teal-600" /> : <Copy size={14} />}
          </button>
          <a
            href={scanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded text-gray-400 hover:text-[#0d5c63] hover:bg-white transition-colors shrink-0"
            title="Buka URL"
          >
            <ExternalLink size={14} />
          </a>
        </div>

        {isLocalhost && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-100">
            <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-amber-800 leading-relaxed">
              <p className="font-semibold mb-0.5">Mode local detected</p>
              <p>
                URL <code className="font-mono">localhost</code> tidak bisa di-scan dari HP siswa.
                Set <code className="font-mono">NEXT_PUBLIC_APP_URL</code> ke IP LAN
                (mis. <code className="font-mono">http://192.168.1.5:3000</code>) atau pakai
                ngrok/cloudflared untuk testing.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Helper ─── */

function StatBadge({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-gray-600">
        <span className="font-bold">{count}</span> {label}
      </span>
    </div>
  );
}

/* ─── Delete Session Modal ─── */

function DeleteSessionModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteSession(id);
      if (result.success) {
        toast.success("Sesi berhasil dihapus");
        onClose();
      } else {
        toast.error(result.error ?? "Gagal menghapus sesi");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle size={22} className="text-red-500" />
          </div>
          <h3 className="text-base font-bold text-gray-900">Hapus Sesi?</h3>
          <p className="text-sm text-gray-500 mt-1">
            Sesi absensi beserta semua data kehadiran akan dihapus permanen.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Batal
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isPending && <Loader2 size={14} className="animate-spin" />}
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}
