"use client";

// src/app/(dashboard)/admin/users/users-client.tsx

import { useState, useTransition } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  ShieldCheck,
  ShieldOff,
  Users,
  Loader2,
  X,
  Mail,
  Phone,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { createUser, updateUser, toggleUserActive, deleteUser } from "./actions";

export type UserItem = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  classCount: number;
  sessionCount: number;
};

type Props = {
  users: UserItem[];
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  TEACHER: "Guru",
};

const ROLE_BADGE: Record<string, string> = {
  ADMIN: "bg-teal-50 text-[#0d5c63]",
  TEACHER: "bg-blue-50 text-blue-600",
};

function formatDate(d: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(d));
}

function formatDateTime(d: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}

export function UsersClient({ users }: Props) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<UserItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);

  const filtered = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const adminCount = users.filter((u) => u.role === "ADMIN").length;
  const teacherCount = users.filter((u) => u.role === "TEACHER").length;
  const activeCount = users.filter((u) => u.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kelola Pengguna</h1>
          <p className="text-sm text-gray-500 mt-1">
            {users.length} pengguna · {activeCount} aktif · {adminCount} admin ·{" "}
            {teacherCount} guru
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0d5c63] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a50] transition-colors"
        >
          <Plus size={16} />
          Tambah Pengguna
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
            placeholder="Cari nama atau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-[#0d5c63] focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
          />
        </div>
        <div className="flex gap-1.5 bg-white border border-gray-200 rounded-xl p-1">
          {["ALL", "ADMIN", "TEACHER"].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                roleFilter === r
                  ? "bg-[#0d5c63] text-white"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {r === "ALL" ? "Semua" : ROLE_LABEL[r]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
              <Users size={20} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-700">
              {search || roleFilter !== "ALL"
                ? "Tidak ada pengguna yang cocok"
                : "Belum ada pengguna"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {search || roleFilter !== "ALL"
                ? "Coba ubah kata kunci atau filter."
                : "Tambahkan pengguna pertama."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left font-semibold text-gray-500 px-5 py-3">
                    Pengguna
                  </th>
                  <th className="text-left font-semibold text-gray-500 px-5 py-3 hidden md:table-cell">
                    Role
                  </th>
                  <th className="text-left font-semibold text-gray-500 px-5 py-3 hidden lg:table-cell">
                    Telepon
                  </th>
                  <th className="text-left font-semibold text-gray-500 px-5 py-3 hidden lg:table-cell">
                    Login Terakhir
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
                {filtered.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    onEdit={() => setEditUser(u)}
                    onDelete={() => setDeleteTarget(u)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <UserFormModal
          mode="create"
          onClose={() => setShowCreate(false)}
        />
      )}
      {editUser && (
        <UserFormModal
          mode="edit"
          user={editUser}
          onClose={() => setEditUser(null)}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          user={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

/* ─── Row ─── */

function UserRow({
  user,
  onEdit,
  onDelete,
}: {
  user: UserItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleUserActive(user.id);
      if (result.success) {
        toast.success(
          user.isActive ? "Pengguna dinonaktifkan" : "Pengguna diaktifkan"
        );
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <tr className="hover:bg-gray-50/50 transition-colors">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              user.isActive
                ? "bg-[#0d5c63] text-white"
                : "bg-gray-200 text-gray-500"
            }`}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5 hidden md:table-cell">
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            ROLE_BADGE[user.role]
          }`}
        >
          {ROLE_LABEL[user.role]}
        </span>
      </td>
      <td className="px-5 py-3.5 text-gray-600 hidden lg:table-cell">
        {user.phone ?? "-"}
      </td>
      <td className="px-5 py-3.5 text-gray-500 text-xs hidden lg:table-cell">
        {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Belum pernah"}
      </td>
      <td className="px-5 py-3.5 text-center">
        <button
          onClick={handleToggle}
          disabled={isPending}
          title={user.isActive ? "Nonaktifkan" : "Aktifkan"}
          className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
            user.isActive
              ? "bg-green-50 text-green-600 hover:bg-green-100"
              : "bg-red-50 text-red-500 hover:bg-red-100"
          }`}
        >
          {isPending ? (
            <Loader2 size={12} className="animate-spin" />
          ) : user.isActive ? (
            <ShieldCheck size={12} />
          ) : (
            <ShieldOff size={12} />
          )}
          {user.isActive ? "Aktif" : "Nonaktif"}
        </button>
      </td>
      <td className="px-5 py-3.5 text-right">
        <div className="flex items-center justify-end gap-1">
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
      </td>
    </tr>
  );
}

/* ─── Form Modal ─── */

function UserFormModal({
  mode,
  user,
  onClose,
}: {
  mode: "create" | "edit";
  user?: UserItem;
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
          ? await createUser(formData)
          : await updateUser(formData);

      if (result.success) {
        toast.success(
          mode === "create"
            ? "Pengguna berhasil ditambahkan"
            : "Pengguna berhasil diubah"
        );
        onClose();
      } else {
        setError(result.error ?? "Terjadi kesalahan");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {mode === "create" ? "Tambah Pengguna" : "Edit Pengguna"}
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
            <input type="hidden" name="id" value={user?.id} />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nama Lengkap
            </label>
            <div className="relative">
              <UserIcon
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                name="name"
                type="text"
                defaultValue={user?.name}
                required
                placeholder="Nama lengkap"
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                name="email"
                type="email"
                defaultValue={user?.email}
                required
                placeholder="email@sekolah.sch.id"
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {mode === "create" ? "Password" : "Password Baru (kosongkan jika tidak diubah)"}
            </label>
            <input
              name="password"
              type="password"
              required={mode === "create"}
              minLength={mode === "create" ? 6 : undefined}
              placeholder={mode === "create" ? "Minimal 6 karakter" : "••••••••"}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Role
            </label>
            <select
              name="role"
              defaultValue={user?.role ?? "TEACHER"}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
            >
              <option value="TEACHER">Guru</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Telepon (opsional)
            </label>
            <div className="relative">
              <Phone
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                name="phone"
                type="text"
                defaultValue={user?.phone ?? ""}
                placeholder="08xxxxxxxxxx"
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
              />
            </div>
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
  user,
  onClose,
}: {
  user: UserItem;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteUser(user.id);
      if (result.success) {
        toast.success("Pengguna berhasil dihapus");
        onClose();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <Trash2 size={20} className="text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 text-center">
          Hapus Pengguna?
        </h3>
        <p className="text-sm text-gray-500 text-center mt-2">
          Yakin ingin menghapus <span className="font-semibold text-gray-700">{user.name}</span>?
          Tindakan ini tidak dapat dibatalkan.
        </p>

        {(user.classCount > 0 || user.sessionCount > 0) && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700 mt-4">
            Pengguna ini memiliki {user.classCount} kelas dan{" "}
            {user.sessionCount} sesi. Pertimbangkan untuk menonaktifkan saja.
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
