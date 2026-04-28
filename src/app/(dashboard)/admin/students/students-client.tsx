"use client";

// src/app/(dashboard)/admin/students/students-client.tsx

import { useState, useTransition, useRef, useCallback } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  GraduationCap,
  Loader2,
  X,
  Upload,
  Download,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { createStudent, updateStudent, deleteStudent, importStudents, type ImportRow } from "./actions";

export type ClassOption = {
  id: string;
  name: string;
};

export type StudentItem = {
  id: string;
  name: string;
  nisn: string | null;
  nis: string | null;
  gender: string | null;
  birthDate: string | null;
  address: string | null;
  parentName: string | null;
  parentPhone: string | null;
  classId: string;
  className: string;
  status: string;
  attendanceCount: number;
  createdAt: string;
};

type Props = {
  students: StudentItem[];
  classes: ClassOption[];
  initialClassId?: string;
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Aktif",
  INACTIVE: "Nonaktif",
  GRADUATED: "Lulus",
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "bg-green-50 text-green-600",
  INACTIVE: "bg-red-50 text-red-500",
  GRADUATED: "bg-blue-50 text-blue-600",
};

const GENDER_LABEL: Record<string, string> = {
  MALE: "Laki-laki",
  FEMALE: "Perempuan",
};

function formatDate(d: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(d));
}

export function StudentsClient({ students, classes, initialClassId }: Props) {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState(initialClassId ?? "ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [editStudent, setEditStudent] = useState<StudentItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StudentItem | null>(null);
  const [detailStudent, setDetailStudent] = useState<StudentItem | null>(null);

  const filtered = students.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.nisn?.includes(search) ?? false) ||
      (s.nis?.includes(search) ?? false);
    const matchClass = classFilter === "ALL" || s.classId === classFilter;
    const matchStatus = statusFilter === "ALL" || s.status === statusFilter;
    return matchSearch && matchClass && matchStatus;
  });

  const [page, setPage] = useState(1);
  const [showImport, setShowImport] = useState(false);
  const perPage = 20;

  const maleCount = students.filter((s) => s.gender === "MALE").length;
  const femaleCount = students.filter((s) => s.gender === "FEMALE").length;

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  // Reset page when filters change
  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleClassFilter = (v: string) => { setClassFilter(v); setPage(1); };
  const handleStatusFilter = (v: string) => { setStatusFilter(v); setPage(1); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Siswa</h1>
          <p className="text-sm text-gray-500 mt-1">
            {students.length} siswa · {maleCount} laki-laki · {femaleCount}{" "}
            perempuan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 bg-white text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            <Upload size={16} />
            Import
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0d5c63] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a50] transition-colors"
          >
            <Plus size={16} />
            Tambah Siswa
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Cari nama, NISN, atau NIS..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-[#0d5c63] focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
          />
        </div>
        <select
          value={classFilter}
          onChange={(e) => handleClassFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-[#0d5c63] focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
        >
          <option value="ALL">Semua Kelas</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => handleStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-[#0d5c63] focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
        >
          <option value="ALL">Semua Status</option>
          <option value="ACTIVE">Aktif</option>
          <option value="INACTIVE">Nonaktif</option>
          <option value="GRADUATED">Lulus</option>
        </select>
      </div>

      {/* Result count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          Menampilkan {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} dari {filtered.length} siswa
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
              <GraduationCap size={20} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-700">
              {search || classFilter !== "ALL" || statusFilter !== "ALL"
                ? "Tidak ada siswa yang cocok"
                : "Belum ada siswa"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {search || classFilter !== "ALL" || statusFilter !== "ALL"
                ? "Coba ubah kata kunci atau filter."
                : "Tambahkan siswa pertama."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left font-semibold text-gray-500 px-5 py-3">
                    Siswa
                  </th>
                  <th className="text-left font-semibold text-gray-500 px-5 py-3 hidden md:table-cell">
                    NISN
                  </th>
                  <th className="text-left font-semibold text-gray-500 px-5 py-3 hidden sm:table-cell">
                    Kelas
                  </th>
                  <th className="text-left font-semibold text-gray-500 px-5 py-3 hidden lg:table-cell">
                    Jenis Kelamin
                  </th>
                  <th className="text-left font-semibold text-gray-500 px-5 py-3 hidden lg:table-cell">
                    Orang Tua
                  </th>
                  <th className="text-center font-semibold text-gray-500 px-5 py-3">
                    Status
                  </th>
                  <th className="text-right font-semibold text-gray-500 px-5 py-3">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => setDetailStudent(s)}
                        className="text-left"
                      >
                        <p className="font-semibold text-gray-900 hover:text-[#0d5c63] transition-colors">
                          {s.name}
                        </p>
                        <p className="text-xs text-gray-400 sm:hidden">
                          {s.className}
                        </p>
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 hidden md:table-cell font-mono text-xs">
                      {s.nisn ?? "-"}
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">
                        {s.className}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 hidden lg:table-cell">
                      {s.gender ? GENDER_LABEL[s.gender] : "-"}
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <p className="text-gray-600 text-xs truncate max-w-[140px]">
                        {s.parentName ?? "-"}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          STATUS_COLOR[s.status]
                        }`}
                      >
                        {STATUS_LABEL[s.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditStudent(s)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-[#0d5c63] hover:bg-teal-50 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(s)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Hapus"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Halaman {page} dari {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                  <span key={`dot-${idx}`} className="px-2 text-xs text-gray-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                      page === p
                        ? "bg-[#0d5c63] text-white"
                        : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <StudentFormModal
          mode="create"
          classes={classes}
          defaultClassId={classFilter !== "ALL" ? classFilter : undefined}
          onClose={() => setShowCreate(false)}
        />
      )}
      {editStudent && (
        <StudentFormModal
          mode="edit"
          student={editStudent}
          classes={classes}
          onClose={() => setEditStudent(null)}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          student={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
      {detailStudent && (
        <DetailModal
          student={detailStudent}
          onClose={() => setDetailStudent(null)}
          onEdit={() => {
            setDetailStudent(null);
            setEditStudent(detailStudent);
          }}
        />
      )}
      {showImport && (
        <ImportModal
          classes={classes}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}

/* ─── Detail Modal ─── */

function DetailModal({
  student,
  onClose,
  onEdit,
}: {
  student: StudentItem;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Detail Siswa</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-[#0d5c63] text-white flex items-center justify-center text-lg font-bold shrink-0">
              {student.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {student.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">
                  {student.className}
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    STATUS_COLOR[student.status]
                  }`}
                >
                  {STATUS_LABEL[student.status]}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <InfoRow label="NISN" value={student.nisn ?? "-"} />
            <InfoRow label="NIS" value={student.nis ?? "-"} />
            <InfoRow
              label="Jenis Kelamin"
              value={student.gender ? GENDER_LABEL[student.gender] : "-"}
            />
            <InfoRow
              label="Tanggal Lahir"
              value={student.birthDate ? formatDate(student.birthDate) : "-"}
            />
            <InfoRow label="Alamat" value={student.address ?? "-"} />
            <InfoRow label="Nama Orang Tua" value={student.parentName ?? "-"} />
            <InfoRow label="Telepon Orang Tua" value={student.parentPhone ?? "-"} />
            <InfoRow
              label="Total Kehadiran"
              value={`${student.attendanceCount} sesi`}
            />
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Tutup
            </button>
            <button
              onClick={onEdit}
              className="flex-1 py-2.5 rounded-lg bg-[#0d5c63] text-white text-sm font-semibold hover:bg-[#0a4a50] transition-colors flex items-center justify-center gap-2"
            >
              <Pencil size={14} />
              Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-gray-400 shrink-0 w-32">{label}</span>
      <span className="text-sm text-gray-900 text-right">{value}</span>
    </div>
  );
}

/* ─── Form Modal ─── */

function StudentFormModal({
  mode,
  student,
  classes,
  defaultClassId,
  onClose,
}: {
  mode: "create" | "edit";
  student?: StudentItem;
  classes: ClassOption[];
  defaultClassId?: string;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createStudent(formData)
          : await updateStudent(formData);

      if (result.success) {
        toast.success(
          mode === "create"
            ? "Siswa berhasil ditambahkan"
            : "Data siswa berhasil diubah"
        );
        onClose();
      } else {
        setError(result.error ?? "Terjadi kesalahan");
      }
    });
  }

  const birthDateDefault = student?.birthDate
    ? new Date(student.birthDate).toISOString().split("T")[0]
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {mode === "create" ? "Tambah Siswa" : "Edit Siswa"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {mode === "edit" && (
            <input type="hidden" name="id" value={student?.id} />
          )}

          {/* Nama */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nama Lengkap *
            </label>
            <input
              name="name"
              type="text"
              defaultValue={student?.name}
              required
              placeholder="Nama lengkap siswa"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
            />
          </div>

          {/* NISN + NIS */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                NISN
              </label>
              <input
                name="nisn"
                type="text"
                defaultValue={student?.nisn ?? ""}
                placeholder="10 digit"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                NIS
              </label>
              <input
                name="nis"
                type="text"
                defaultValue={student?.nis ?? ""}
                placeholder="NIS sekolah"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
              />
            </div>
          </div>

          {/* Kelas + Jenis Kelamin */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Kelas *
              </label>
              <select
                name="classId"
                defaultValue={student?.classId ?? defaultClassId ?? ""}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
              >
                <option value="">Pilih kelas</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Jenis Kelamin
              </label>
              <select
                name="gender"
                defaultValue={student?.gender ?? ""}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
              >
                <option value="">Pilih</option>
                <option value="MALE">Laki-laki</option>
                <option value="FEMALE">Perempuan</option>
              </select>
            </div>
          </div>

          {/* Tanggal Lahir */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Tanggal Lahir
            </label>
            <input
              name="birthDate"
              type="date"
              defaultValue={birthDateDefault}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
            />
          </div>

          {/* Alamat */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Alamat
            </label>
            <textarea
              name="address"
              rows={2}
              defaultValue={student?.address ?? ""}
              placeholder="Alamat lengkap"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all resize-none"
            />
          </div>

          {/* Orang Tua */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nama Orang Tua
              </label>
              <input
                name="parentName"
                type="text"
                defaultValue={student?.parentName ?? ""}
                placeholder="Nama orang tua"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Telepon Orang Tua
              </label>
              <input
                name="parentPhone"
                type="text"
                defaultValue={student?.parentPhone ?? ""}
                placeholder="08xxxxxxxxxx"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
              />
            </div>
          </div>

          {/* Status (edit only) */}
          {mode === "edit" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Status
              </label>
              <select
                name="status"
                defaultValue={student?.status ?? "ACTIVE"}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
              >
                <option value="ACTIVE">Aktif</option>
                <option value="INACTIVE">Nonaktif</option>
                <option value="GRADUATED">Lulus</option>
              </select>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 rounded-lg bg-[#0d5c63] text-white text-sm font-semibold hover:bg-[#0a4a50] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {mode === "create" ? "Tambahkan" : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Delete Modal ─── */

function DeleteConfirmModal({
  student,
  onClose,
}: {
  student: StudentItem;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteStudent(student.id);
      if (result.success) {
        toast.success("Siswa berhasil dihapus");
        onClose();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <Trash2 size={20} className="text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 text-center">
          Hapus Siswa?
        </h3>
        <p className="text-sm text-gray-500 text-center mt-2">
          Yakin ingin menghapus{" "}
          <span className="font-semibold text-gray-700">{student.name}</span>?
          Tindakan ini tidak dapat dibatalkan.
        </p>

        {student.attendanceCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700 mt-4">
            Siswa ini memiliki {student.attendanceCount} data kehadiran. Ubah
            status menjadi Nonaktif/Lulus saja.
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
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

/* ─── Import Modal ─── */

const COLUMN_MAP: Record<string, keyof ImportRow> = {
  nama: "name",
  name: "name",
  "nama lengkap": "name",
  nisn: "nisn",
  nis: "nis",
  "jenis kelamin": "gender",
  gender: "gender",
  jk: "gender",
  "tanggal lahir": "birthDate",
  "tgl lahir": "birthDate",
  birthdate: "birthDate",
  alamat: "address",
  address: "address",
  "nama orang tua": "parentName",
  "orang tua": "parentName",
  "nama ortu": "parentName",
  parentname: "parentName",
  "telepon orang tua": "parentPhone",
  "telp ortu": "parentPhone",
  "hp ortu": "parentPhone",
  parentphone: "parentPhone",
  kelas: "className",
  class: "className",
};

function downloadTemplate() {
  const headers = [
    "Nama",
    "NISN",
    "NIS",
    "Jenis Kelamin",
    "Tanggal Lahir",
    "Alamat",
    "Nama Orang Tua",
    "Telepon Orang Tua",
    "Kelas",
  ];
  const example = [
    "Ahmad Fauzi",
    "1234567890",
    "001",
    "L",
    "2010-05-15",
    "Jl. Merdeka No. 1",
    "Budi Santoso",
    "081234567890",
    "VII A",
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  ws["!cols"] = headers.map(() => ({ wch: 20 }));
  XLSX.writeFile(wb, "template_import_siswa.xlsx");
}

function parseFile(file: File): Promise<ImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (raw.length < 2) {
          reject(new Error("File kosong atau hanya header"));
          return;
        }

        const headerRow = raw[0].map((h) => String(h).trim().toLowerCase());
        const colMapping: (keyof ImportRow | null)[] = headerRow.map(
          (h) => COLUMN_MAP[h] ?? null
        );

        if (!colMapping.includes("name")) {
          reject(new Error('Kolom "Nama" tidak ditemukan di header'));
          return;
        }

        const rows: ImportRow[] = [];
        for (let i = 1; i < raw.length; i++) {
          const row = raw[i];
          if (!row || row.every((cell) => !cell)) continue;

          const item: ImportRow = { name: "" };
          for (let j = 0; j < colMapping.length; j++) {
            const key = colMapping[j];
            if (key && row[j] != null) {
              (item as Record<string, string>)[key] = String(row[j]).trim();
            }
          }
          if (item.name) rows.push(item);
        }

        resolve(rows);
      } catch {
        reject(new Error("Gagal membaca file"));
      }
    };
    reader.onerror = () => reject(new Error("Gagal membaca file"));
    reader.readAsArrayBuffer(file);
  });
}

function ImportModal({
  classes,
  onClose,
}: {
  classes: ClassOption[];
  onClose: () => void;
}) {
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [defaultClassId, setDefaultClassId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");

    try {
      const parsed = await parseFile(file);
      if (parsed.length === 0) {
        setError("Tidak ada data yang ditemukan di file");
        return;
      }
      setRows(parsed);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membaca file");
    }
  }

  function handleImport() {
    if (!defaultClassId && rows.some((r) => !r.className)) {
      setError("Pilih kelas default untuk siswa tanpa kolom kelas");
      return;
    }
    setError("");

    startTransition(async () => {
      const res = await importStudents(rows, defaultClassId);
      setResult({ imported: res.imported, skipped: res.skipped, errors: res.errors });
      setStep("result");
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Import Data Siswa</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {step === "upload" && (
            <div className="space-y-5">
              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl hover:border-[#0d5c63] transition-colors">
                <FileSpreadsheet size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-700">
                  Upload file Excel (.xlsx) atau CSV
                </p>
                <p className="text-xs text-gray-400 mt-1 mb-4">
                  Pastikan kolom header sesuai format template
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFile}
                  className="hidden"
                />
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="px-4 py-2 rounded-lg bg-[#0d5c63] text-white text-sm font-semibold hover:bg-[#0a4a50] transition-colors"
                  >
                    Pilih File
                  </button>
                  <button
                    onClick={downloadTemplate}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Download size={14} />
                    Download Template
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
                <p className="text-xs font-semibold text-blue-700 mb-1">Format Kolom:</p>
                <p className="text-xs text-blue-600">
                  Nama*, NISN, NIS, Jenis Kelamin (L/P), Tanggal Lahir (YYYY-MM-DD),
                  Alamat, Nama Orang Tua, Telepon Orang Tua, Kelas
                </p>
                <p className="text-xs text-blue-500 mt-1">* Wajib diisi. Kolom Kelas opsional jika memilih kelas default.</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">
                  <span className="font-bold text-gray-900">{rows.length}</span> siswa siap diimpor
                </p>
                <button
                  onClick={() => { setStep("upload"); setRows([]); setError(""); }}
                  className="text-xs font-medium text-gray-500 hover:text-gray-700"
                >
                  Ganti file
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Kelas Default (untuk siswa tanpa kolom kelas)
                </label>
                <select
                  value={defaultClassId}
                  onChange={(e) => setDefaultClassId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
                >
                  <option value="">Pilih kelas</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr>
                        <th className="text-left font-semibold text-gray-500 px-3 py-2">#</th>
                        <th className="text-left font-semibold text-gray-500 px-3 py-2">Nama</th>
                        <th className="text-left font-semibold text-gray-500 px-3 py-2">NISN</th>
                        <th className="text-left font-semibold text-gray-500 px-3 py-2">JK</th>
                        <th className="text-left font-semibold text-gray-500 px-3 py-2">Kelas</th>
                        <th className="text-left font-semibold text-gray-500 px-3 py-2">Orang Tua</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {rows.slice(0, 50).map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50/50">
                          <td className="px-3 py-1.5 text-gray-400">{i + 1}</td>
                          <td className="px-3 py-1.5 font-medium text-gray-900">{r.name}</td>
                          <td className="px-3 py-1.5 text-gray-600 font-mono">{r.nisn ?? "-"}</td>
                          <td className="px-3 py-1.5 text-gray-600">{r.gender ?? "-"}</td>
                          <td className="px-3 py-1.5 text-gray-600">{r.className ?? "Default"}</td>
                          <td className="px-3 py-1.5 text-gray-600">{r.parentName ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {rows.length > 50 && (
                  <div className="px-3 py-2 bg-gray-50 text-xs text-gray-400 text-center">
                    ... dan {rows.length - 50} baris lainnya
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleImport}
                  disabled={isPending}
                  className="flex-1 py-2.5 rounded-lg bg-[#0d5c63] text-white text-sm font-semibold hover:bg-[#0a4a50] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isPending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Mengimpor...
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      Import {rows.length} Siswa
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === "result" && result && (
            <div className="space-y-4">
              <div className="text-center py-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                  result.imported > 0 ? "bg-green-50" : "bg-amber-50"
                }`}>
                  {result.imported > 0 ? (
                    <CheckCircle2 size={28} className="text-green-500" />
                  ) : (
                    <AlertTriangle size={28} className="text-amber-500" />
                  )}
                </div>
                <h3 className="text-lg font-bold text-gray-900">Import Selesai</h3>
                <div className="flex items-center justify-center gap-4 mt-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{result.imported}</p>
                    <p className="text-xs text-gray-400">Berhasil</p>
                  </div>
                  <div className="w-px h-8 bg-gray-200" />
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-500">{result.skipped}</p>
                    <p className="text-xs text-gray-400">Dilewati</p>
                  </div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 max-h-40 overflow-y-auto">
                  <p className="text-xs font-semibold text-amber-700 mb-2">Detail:</p>
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-xs text-amber-600 mb-0.5">{err}</p>
                  ))}
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-lg bg-[#0d5c63] text-white text-sm font-semibold hover:bg-[#0a4a50] transition-colors"
              >
                Selesai
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
