"use client";

// src/app/(dashboard)/admin/classes/classes-client.tsx

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  GraduationCap,
  Loader2,
  X,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { createClass, updateClass, toggleClassActive, deleteClass } from "./actions";

export type TeacherOption = {
  id: string;
  name: string;
};

export type ClassItem = {
  id: string;
  name: string;
  grade: string | null;
  teacherId: string | null;
  teacherName: string | null;
  isActive: boolean;
  studentCount: number;
  sessionCount: number;
  createdAt: string;
};

type Props = {
  classes: ClassItem[];
  teachers: TeacherOption[];
};

const GRADE_OPTIONS = [
  { value: "", label: "Semua Tingkat" },
  { value: "7", label: "Kelas 7" },
  { value: "8", label: "Kelas 8" },
  { value: "9", label: "Kelas 9" },
  { value: "10", label: "Kelas 10" },
  { value: "11", label: "Kelas 11" },
  { value: "12", label: "Kelas 12" },
];

export function ClassesClient({ classes, teachers }: Props) {
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editClass, setEditClass] = useState<ClassItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClassItem | null>(null);

  const filtered = classes.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.teacherName?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchGrade = !gradeFilter || c.grade === gradeFilter;
    return matchSearch && matchGrade;
  });

  const activeCount = classes.filter((c) => c.isActive).length;
  const totalStudents = classes.reduce((sum, c) => sum + c.studentCount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kelola Kelas</h1>
          <p className="text-sm text-gray-500 mt-1">
            {classes.length} kelas · {activeCount} aktif · {totalStudents} siswa
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0d5c63] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a50] transition-colors"
        >
          <Plus size={16} />
          Tambah Kelas
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Cari nama kelas atau wali kelas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-[#0d5c63] focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
          />
        </div>
        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-[#0d5c63] focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
        >
          {GRADE_OPTIONS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </div>

      {/* Cards Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
            <BookOpen size={20} className="text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700">
            {search || gradeFilter
              ? "Tidak ada kelas yang cocok"
              : "Belum ada kelas"}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {search || gradeFilter
              ? "Coba ubah kata kunci atau filter."
              : "Tambahkan kelas pertama."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <ClassCard
              key={c.id}
              cls={c}
              onEdit={() => setEditClass(c)}
              onDelete={() => setDeleteTarget(c)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <ClassFormModal
          mode="create"
          teachers={teachers}
          onClose={() => setShowCreate(false)}
        />
      )}
      {editClass && (
        <ClassFormModal
          mode="edit"
          cls={editClass}
          teachers={teachers}
          onClose={() => setEditClass(null)}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          cls={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

/* ─── Class Card ─── */

function ClassCard({
  cls,
  onEdit,
  onDelete,
}: {
  cls: ClassItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleClassActive(cls.id);
      if (result.success) {
        toast.success(cls.isActive ? "Kelas dinonaktifkan" : "Kelas diaktifkan");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div
      className={`bg-white rounded-2xl border p-5 hover:shadow-md transition-shadow ${
        cls.isActive ? "border-gray-100" : "border-gray-200 opacity-70"
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
          <BookOpen size={18} />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-gray-400 hover:text-[#0d5c63] hover:bg-teal-50 transition-colors"
            title="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Hapus"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <h3 className="text-lg font-bold text-gray-900">{cls.name}</h3>
      {cls.grade && (
        <p className="text-xs text-gray-400 mt-0.5">Tingkat {cls.grade}</p>
      )}

      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <GraduationCap size={14} className="text-gray-400 shrink-0" />
          <Link
            href={`/admin/students?classId=${cls.id}`}
            className="hover:text-[#0d5c63] hover:underline"
          >
            {cls.studentCount} siswa
          </Link>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="w-3.5 h-3.5 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          </span>
          {cls.teacherName ?? "Belum ada wali kelas"}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
        <button
          onClick={handleToggle}
          disabled={isPending}
          className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
            cls.isActive
              ? "bg-green-50 text-green-600 hover:bg-green-100"
              : "bg-red-50 text-red-500 hover:bg-red-100"
          }`}
        >
          {isPending ? (
            <Loader2 size={12} className="animate-spin" />
          ) : cls.isActive ? (
            <CheckCircle2 size={12} />
          ) : (
            <XCircle size={12} />
          )}
          {cls.isActive ? "Aktif" : "Nonaktif"}
        </button>
        <span className="text-xs text-gray-400">{cls.sessionCount} sesi</span>
      </div>
    </div>
  );
}

/* ─── Form Modal ─── */

function ClassFormModal({
  mode,
  cls,
  teachers,
  onClose,
}: {
  mode: "create" | "edit";
  cls?: ClassItem;
  teachers: TeacherOption[];
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
          ? await createClass(formData)
          : await updateClass(formData);

      if (result.success) {
        toast.success(
          mode === "create"
            ? "Kelas berhasil ditambahkan"
            : "Kelas berhasil diubah"
        );
        onClose();
      } else {
        setError(result.error ?? "Terjadi kesalahan");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {mode === "create" ? "Tambah Kelas" : "Edit Kelas"}
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
            <input type="hidden" name="id" value={cls?.id} />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nama Kelas
            </label>
            <input
              name="name"
              type="text"
              defaultValue={cls?.name}
              required
              placeholder="Contoh: VII A"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Tingkat (opsional)
            </label>
            <select
              name="grade"
              defaultValue={cls?.grade ?? ""}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
            >
              <option value="">Pilih tingkat</option>
              <option value="7">7</option>
              <option value="8">8</option>
              <option value="9">9</option>
              <option value="10">10</option>
              <option value="11">11</option>
              <option value="12">12</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Wali Kelas (opsional)
            </label>
            <select
              name="teacherId"
              defaultValue={cls?.teacherId ?? ""}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
            >
              <option value="">Pilih guru</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

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
  cls,
  onClose,
}: {
  cls: ClassItem;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteClass(cls.id);
      if (result.success) {
        toast.success("Kelas berhasil dihapus");
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
          Hapus Kelas?
        </h3>
        <p className="text-sm text-gray-500 text-center mt-2">
          Yakin ingin menghapus kelas{" "}
          <span className="font-semibold text-gray-700">{cls.name}</span>?
          Tindakan ini tidak dapat dibatalkan.
        </p>

        {(cls.studentCount > 0 || cls.sessionCount > 0) && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700 mt-4">
            Kelas ini memiliki {cls.studentCount} siswa dan {cls.sessionCount}{" "}
            sesi absensi. Pindahkan siswa terlebih dahulu atau nonaktifkan kelas.
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
