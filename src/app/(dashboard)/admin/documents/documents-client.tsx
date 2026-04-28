"use client";

// src/app/(dashboard)/admin/documents/documents-client.tsx

import { useState, useTransition } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  FileSignature,
  Loader2,
  X,
  Send,
  Eye,
  UserPlus,
  UserMinus,
  ChevronLeft,
  ChevronRight,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  createDocument,
  updateDocument,
  deleteDocument,
  addRecipient,
  removeRecipient,
  sendDocument,
} from "./actions";

/* ─── Types ─── */

export type RecipientItem = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  signedAt: string | null;
};

export type SignatureItem = {
  id: string;
  userId: string | null;
  userName: string | null;
  signedAt: string;
};

export type DocumentItem = {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string;
  signedUrl: string | null;
  status: string;
  createdById: string;
  creatorName: string;
  recipients: RecipientItem[];
  signatures: SignatureItem[];
  createdAt: string;
  updatedAt: string;
};

type Props = {
  documents: DocumentItem[];
};

/* ─── Constants ─── */

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-600", icon: <FileText size={12} /> },
  SENT: { label: "Terkirim", color: "bg-blue-50 text-blue-600", icon: <Send size={12} /> },
  IN_PROGRESS: { label: "Proses", color: "bg-amber-50 text-amber-600", icon: <Clock size={12} /> },
  COMPLETED: { label: "Selesai", color: "bg-green-50 text-green-600", icon: <CheckCircle2 size={12} /> },
  CANCELLED: { label: "Dibatalkan", color: "bg-red-50 text-red-500", icon: <XCircle size={12} /> },
};

const ROLE_LABEL: Record<string, string> = {
  ORANG_TUA: "Orang Tua",
  GURU: "Guru",
  MURID: "Murid",
  WALI_KELAS: "Wali Kelas",
  KEPALA_SEKOLAH: "Kepala Sekolah",
};

const SIGN_STATUS_LABEL: Record<string, string> = {
  PENDING: "Belum",
  OPENED: "Dibuka",
  SIGNED: "Sudah",
  DECLINED: "Ditolak",
};

const SIGN_STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-500",
  OPENED: "bg-blue-50 text-blue-600",
  SIGNED: "bg-green-50 text-green-600",
  DECLINED: "bg-red-50 text-red-500",
};

function formatDate(d: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(d));
}

/* ─── Main Component ─── */

export function DocumentsClient({ documents }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [editDoc, setEditDoc] = useState<DocumentItem | null>(null);
  const [viewDoc, setViewDoc] = useState<DocumentItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 10;

  const filtered = documents.filter((d) => {
    const matchSearch =
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.creatorName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleStatus = (v: string) => { setStatusFilter(v); setPage(1); };

  const statusCounts = documents.reduce<Record<string, number>>((acc, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kelola Dokumen</h1>
          <p className="text-sm text-gray-500 mt-1">
            {documents.length} dokumen terdaftar
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0d5c63] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a50] transition-colors"
        >
          <Plus size={16} />
          Buat Dokumen
        </button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(["DRAFT", "SENT", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const).map((s) => {
          const cfg = STATUS_CONFIG[s];
          return (
            <button
              key={s}
              onClick={() => handleStatus(statusFilter === s ? "ALL" : s)}
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
              <p className="text-lg font-bold text-gray-900">{statusCounts[s] ?? 0}</p>
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
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Cari judul atau pembuat..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
          />
        </div>
      </div>

      {/* Info */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          Menampilkan {Math.min((page - 1) * perPage + 1, filtered.length)}–
          {Math.min(page * perPage, filtered.length)} dari {filtered.length} dokumen
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left font-semibold text-gray-500 px-5 py-3">Dokumen</th>
                <th className="text-left font-semibold text-gray-500 px-3 py-3">Pembuat</th>
                <th className="text-center font-semibold text-gray-500 px-3 py-3">Penerima</th>
                <th className="text-center font-semibold text-gray-500 px-3 py-3">Tanda Tangan</th>
                <th className="text-center font-semibold text-gray-500 px-3 py-3">Status</th>
                <th className="text-left font-semibold text-gray-500 px-3 py-3">Tanggal</th>
                <th className="text-center font-semibold text-gray-500 px-3 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.map((doc) => {
                const cfg = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.DRAFT;
                const signedCount = doc.recipients.filter((r) => r.status === "SIGNED").length;
                return (
                  <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-gray-900 truncate max-w-[200px]">{doc.title}</p>
                      {doc.description && (
                        <p className="text-xs text-gray-400 truncate max-w-[200px]">{doc.description}</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-gray-600">{doc.creatorName}</td>
                    <td className="px-3 py-3 text-center text-gray-600">{doc.recipients.length}</td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-xs font-medium">
                        <span className="text-green-600">{signedCount}</span>
                        <span className="text-gray-300">/{doc.recipients.length}</span>
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${cfg.color}`}>
                        {cfg.icon}
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500">{formatDate(doc.createdAt)}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setViewDoc(doc)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-[#0d5c63] hover:bg-[#0d5c63]/5 transition-colors"
                          title="Detail"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => setEditDoc(doc)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteId(doc.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Hapus"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <FileSignature size={36} className="mx-auto text-gray-200 mb-3" />
                    <p className="text-sm font-medium text-gray-400">Belum ada dokumen</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">Halaman {page} dari {totalPages}</p>
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
      {showCreate && <CreateDocModal onClose={() => setShowCreate(false)} />}
      {editDoc && <EditDocModal doc={editDoc} onClose={() => setEditDoc(null)} />}
      {viewDoc && <ViewDocModal doc={viewDoc} onClose={() => setViewDoc(null)} />}
      {deleteId && <DeleteConfirmModal id={deleteId} onClose={() => setDeleteId(null)} />}
    </div>
  );
}

/* ─── Create Document Modal ─── */

function CreateDocModal({ onClose }: { onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createDocument(formData);
      if (result.success) {
        toast.success("Dokumen berhasil dibuat");
        onClose();
      } else {
        setError(result.error ?? "Terjadi kesalahan");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Buat Dokumen Baru</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Judul *</label>
            <input
              name="title"
              required
              placeholder="Judul dokumen"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Deskripsi</label>
            <textarea
              name="description"
              rows={3}
              placeholder="Deskripsi dokumen (opsional)"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">URL File *</label>
            <input
              name="fileUrl"
              required
              placeholder="https://... atau path ke file"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
            />
            <p className="text-xs text-gray-400 mt-1">Link ke file dokumen (PDF, gambar, dll)</p>
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
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Buat
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Edit Document Modal ─── */

function EditDocModal({ doc, onClose }: { doc: DocumentItem; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateDocument(formData);
      if (result.success) {
        toast.success("Dokumen berhasil diupdate");
        onClose();
      } else {
        setError(result.error ?? "Terjadi kesalahan");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Edit Dokumen</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <input type="hidden" name="id" value={doc.id} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Judul *</label>
            <input
              name="title"
              required
              defaultValue={doc.title}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Deskripsi</label>
            <textarea
              name="description"
              rows={3}
              defaultValue={doc.description ?? ""}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
            <select
              name="status"
              defaultValue={doc.status}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
            >
              <option value="DRAFT">Draft</option>
              <option value="SENT">Terkirim</option>
              <option value="IN_PROGRESS">Dalam Proses</option>
              <option value="COMPLETED">Selesai</option>
              <option value="CANCELLED">Dibatalkan</option>
            </select>
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
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />}
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── View Document Modal (Detail + Recipients) ─── */

function ViewDocModal({ doc, onClose }: { doc: DocumentItem; onClose: () => void }) {
  const [showAddRecipient, setShowAddRecipient] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSend() {
    startTransition(async () => {
      const result = await sendDocument(doc.id);
      if (result.success) {
        toast.success("Dokumen berhasil dikirim");
        onClose();
      } else {
        toast.error(result.error ?? "Gagal mengirim");
      }
    });
  }

  function handleRemoveRecipient(id: string) {
    startTransition(async () => {
      const result = await removeRecipient(id);
      if (result.success) {
        toast.success("Penerima dihapus");
        onClose();
      } else {
        toast.error(result.error ?? "Gagal menghapus");
      }
    });
  }

  const cfg = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.DRAFT;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Detail Dokumen</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Doc Info */}
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">{doc.title}</h3>
                {doc.description && <p className="text-sm text-gray-500 mt-0.5">{doc.description}</p>}
              </div>
              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${cfg.color}`}>
                {cfg.icon}
                {cfg.label}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-400">Pembuat</span>
                <p className="font-medium text-gray-700">{doc.creatorName}</p>
              </div>
              <div>
                <span className="text-gray-400">Dibuat</span>
                <p className="font-medium text-gray-700">{formatDate(doc.createdAt)}</p>
              </div>
              <div>
                <span className="text-gray-400">File</span>
                <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="font-medium text-[#0d5c63] hover:underline block truncate">
                  Lihat File
                </a>
              </div>
              {doc.signedUrl && (
                <div>
                  <span className="text-gray-400">File Bertandatangan</span>
                  <a href={doc.signedUrl} target="_blank" rel="noreferrer" className="font-medium text-[#0d5c63] hover:underline block truncate">
                    Lihat
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Recipients */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-gray-900">Penerima ({doc.recipients.length})</h4>
              {doc.status === "DRAFT" && (
                <button
                  onClick={() => setShowAddRecipient(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0d5c63] hover:underline"
                >
                  <UserPlus size={13} />
                  Tambah
                </button>
              )}
            </div>

            {doc.recipients.length > 0 ? (
              <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50">
                {doc.recipients.map((r) => (
                  <div key={r.id} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{r.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">
                          {ROLE_LABEL[r.role] ?? r.role}
                        </span>
                        {r.email && <span className="text-xs text-gray-400">· {r.email}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${SIGN_STATUS_COLOR[r.status] ?? "bg-gray-100 text-gray-500"}`}>
                        {SIGN_STATUS_LABEL[r.status] ?? r.status}
                      </span>
                      {doc.status === "DRAFT" && (
                        <button
                          onClick={() => handleRemoveRecipient(r.id)}
                          disabled={isPending}
                          className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <UserMinus size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl">
                <p className="text-xs text-gray-400">Belum ada penerima</p>
              </div>
            )}
          </div>

          {/* Signatures */}
          {doc.signatures.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-gray-900 mb-3">Tanda Tangan ({doc.signatures.length})</h4>
              <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50">
                {doc.signatures.map((s) => (
                  <div key={s.id} className="flex items-center justify-between px-4 py-2.5">
                    <p className="text-sm text-gray-700">{s.userName ?? "Pihak Eksternal"}</p>
                    <span className="text-xs text-gray-400">{formatDate(s.signedAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-100 shrink-0 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Tutup
          </button>
          {doc.status === "DRAFT" && (
            <button
              onClick={handleSend}
              disabled={isPending}
              className="flex-1 py-2.5 rounded-lg bg-[#0d5c63] text-white text-sm font-semibold hover:bg-[#0a4a50] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Kirim Dokumen
            </button>
          )}
        </div>
      </div>

      {/* Add Recipient Sub-modal */}
      {showAddRecipient && (
        <AddRecipientModal
          documentId={doc.id}
          onClose={() => { setShowAddRecipient(false); onClose(); }}
          onCancel={() => setShowAddRecipient(false)}
        />
      )}
    </div>
  );
}

/* ─── Add Recipient Modal ─── */

function AddRecipientModal({
  documentId,
  onClose,
  onCancel,
}: {
  documentId: string;
  onClose: () => void;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await addRecipient(formData);
      if (result.success) {
        toast.success("Penerima ditambahkan");
        onClose();
      } else {
        setError(result.error ?? "Terjadi kesalahan");
      }
    });
  }

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Tambah Penerima</h2>
          <button onClick={onCancel} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <input type="hidden" name="documentId" value={documentId} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama *</label>
            <input
              name="name"
              required
              placeholder="Nama penerima"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                name="email"
                type="email"
                placeholder="email@..."
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Telepon</label>
              <input
                name="phone"
                type="text"
                placeholder="08xx..."
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Peran *</label>
            <select
              name="role"
              required
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
            >
              <option value="">Pilih peran</option>
              <option value="KEPALA_SEKOLAH">Kepala Sekolah</option>
              <option value="WALI_KELAS">Wali Kelas</option>
              <option value="GURU">Guru</option>
              <option value="ORANG_TUA">Orang Tua</option>
              <option value="MURID">Murid</option>
            </select>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 rounded-lg bg-[#0d5c63] text-white text-sm font-semibold hover:bg-[#0a4a50] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
              Tambah
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Delete Confirm Modal ─── */

function DeleteConfirmModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteDocument(id);
      if (result.success) {
        toast.success("Dokumen dihapus");
        onClose();
      } else {
        toast.error(result.error ?? "Gagal menghapus");
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
          <h3 className="text-base font-bold text-gray-900">Hapus Dokumen?</h3>
          <p className="text-sm text-gray-500 mt-1">
            Dokumen beserta semua penerima dan tanda tangan akan dihapus permanen.
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
