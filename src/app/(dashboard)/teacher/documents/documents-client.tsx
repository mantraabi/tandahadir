"use client";

// src/app/(dashboard)/teacher/documents/documents-client.tsx

import { useState, useTransition, useMemo } from "react";
import {
  FileText,
  Plus,
  X,
  Loader2,
  Search,
  Eye,
  Pencil,
  Trash2,
  Send,
  UserPlus,
  ExternalLink,
  Inbox,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Mail,
  Phone,
  Users as UsersIcon,
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
  token: string | null;
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
  createdAt: string;
  updatedAt: string;
};

type Props = {
  myDocuments: DocumentItem[];
  forMeDocuments: DocumentItem[];
  myEmail: string | null;
};

/* ─── Constants ─── */

const DOC_STATUS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-600", icon: <FileText size={11} /> },
  SENT: { label: "Terkirim", color: "bg-blue-50 text-blue-600", icon: <Send size={11} /> },
  IN_PROGRESS: { label: "Proses", color: "bg-amber-50 text-amber-600", icon: <Clock size={11} /> },
  COMPLETED: { label: "Selesai", color: "bg-teal-50 text-teal-600", icon: <CheckCircle2 size={11} /> },
  CANCELLED: { label: "Dibatalkan", color: "bg-red-50 text-red-500", icon: <XCircle size={11} /> },
};

const RECIPIENT_ROLE: Record<string, string> = {
  ORANG_TUA: "Orang Tua",
  GURU: "Guru",
  MURID: "Murid",
  WALI_KELAS: "Wali Kelas",
  KEPALA_SEKOLAH: "Kepala Sekolah",
};

const SIGN_STATUS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Menunggu", color: "bg-gray-100 text-gray-500" },
  OPENED: { label: "Dibuka", color: "bg-blue-50 text-blue-600" },
  SIGNED: { label: "Ditandatangani", color: "bg-teal-50 text-teal-600" },
  DECLINED: { label: "Ditolak", color: "bg-red-50 text-red-500" },
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

/* ─── Main Component ─── */

export function DocumentsClient({ myDocuments, forMeDocuments, myEmail }: Props) {
  const [tab, setTab] = useState<"mine" | "forme">("mine");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const [showCreate, setShowCreate] = useState(false);
  const [editDoc, setEditDoc] = useState<DocumentItem | null>(null);
  const [detailDoc, setDetailDoc] = useState<DocumentItem | null>(null);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);

  const perPage = 10;
  const sourceList = tab === "mine" ? myDocuments : forMeDocuments;

  const filtered = useMemo(() => {
    return sourceList.filter((d) => {
      const matchSearch =
        d.title.toLowerCase().includes(search.toLowerCase()) ||
        d.creatorName.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "ALL" || d.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [sourceList, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  function switchTab(t: "mine" | "forme") {
    setTab(t);
    setPage(1);
    setSearch("");
    setStatusFilter("ALL");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dokumen</h1>
          <p className="text-sm text-gray-500 mt-1">
            {myDocuments.length} dibuat · {forMeDocuments.length} untuk saya
          </p>
        </div>
        {tab === "mine" && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0d5c63] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a50] transition-colors"
          >
            <Plus size={16} />
            Buat Dokumen
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-100">
        <TabButton active={tab === "mine"} onClick={() => switchTab("mine")} icon={<FileText size={14} />}>
          Saya Buat ({myDocuments.length})
        </TabButton>
        <TabButton active={tab === "forme"} onClick={() => switchTab("forme")} icon={<Inbox size={14} />}>
          Untuk Saya ({forMeDocuments.length})
        </TabButton>
      </div>

      {/* Status Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(["DRAFT", "SENT", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const).map((s) => {
          const cfg = DOC_STATUS[s];
          const count = sourceList.filter((d) => d.status === s).length;
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
            placeholder="Cari judul atau pembuat..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
          />
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left font-semibold text-gray-500 px-5 py-3">Judul</th>
                <th className="text-left font-semibold text-gray-500 px-3 py-3 hidden md:table-cell">Pembuat</th>
                <th className="text-center font-semibold text-gray-500 px-3 py-3 hidden sm:table-cell">Penerima</th>
                <th className="text-center font-semibold text-gray-500 px-3 py-3">Status</th>
                <th className="text-left font-semibold text-gray-500 px-3 py-3 hidden lg:table-cell">Tanggal</th>
                <th className="text-right font-semibold text-gray-500 px-5 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.map((d) => {
                const cfg = DOC_STATUS[d.status] ?? DOC_STATUS.DRAFT;
                const signedCount = d.recipients.filter((r) => r.status === "SIGNED").length;
                const isOwner = tab === "mine";
                return (
                  <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#0d5c63]/10 flex items-center justify-center shrink-0">
                          <FileText size={16} className="text-[#0d5c63]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate max-w-xs">{d.title}</p>
                          {d.description && (
                            <p className="text-xs text-gray-400 truncate max-w-xs">{d.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-600 hidden md:table-cell">{d.creatorName}</td>
                    <td className="px-3 py-3 text-center hidden sm:table-cell">
                      <span className="text-xs font-medium text-gray-700">
                        {signedCount}/{d.recipients.length}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>
                        {cfg.icon}
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-500 hidden lg:table-cell">{formatDate(d.createdAt)}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          onClick={() => setDetailDoc(d)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-[#0d5c63] hover:bg-[#0d5c63]/5 transition-colors"
                          title="Detail"
                        >
                          <Eye size={15} />
                        </button>
                        {isOwner && (
                          <>
                            <button
                              onClick={() => setEditDoc(d)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Edit"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => setDeleteDocId(d.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Hapus"
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <FileText size={32} className="mx-auto text-gray-200 mb-2" />
                    <p className="text-sm font-medium text-gray-400">
                      {tab === "mine" ? "Belum ada dokumen yang Anda buat" : "Belum ada dokumen untuk Anda"}
                    </p>
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
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}
      {editDoc && <EditModal doc={editDoc} onClose={() => setEditDoc(null)} />}
      {detailDoc && (
        <DetailModal
          doc={detailDoc}
          isOwner={detailDoc.createdById !== "" && tab === "mine"}
          myEmail={myEmail}
          onClose={() => setDetailDoc(null)}
        />
      )}
      {deleteDocId && <DeleteModal id={deleteDocId} onClose={() => setDeleteDocId(null)} />}
    </div>
  );
}

/* ─── Tab Button ─── */

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
        active
          ? "border-[#0d5c63] text-[#0d5c63]"
          : "border-transparent text-gray-400 hover:text-gray-600"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

/* ─── Create Modal ─── */

function CreateModal({ onClose }: { onClose: () => void }) {
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
    <ModalShell title="Buat Dokumen Baru" onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <FormField label="Judul *">
          <input
            name="title"
            required
            placeholder="Contoh: Surat Edaran Rapat Wali Kelas"
            className="form-input"
          />
        </FormField>
        <FormField label="Deskripsi">
          <textarea
            name="description"
            rows={3}
            placeholder="Deskripsi singkat dokumen (opsional)"
            className="form-input resize-none"
          />
        </FormField>
        <FormField label="URL File *">
          <input
            name="fileUrl"
            type="url"
            required
            placeholder="https://..."
            className="form-input"
          />
        </FormField>
        {error && <ErrorBox message={error} />}
        <FormFooter onClose={onClose} isPending={isPending} submitLabel="Buat Dokumen" />
      </form>
    </ModalShell>
  );
}

/* ─── Edit Modal ─── */

function EditModal({ doc, onClose }: { doc: DocumentItem; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateDocument(doc.id, formData);
      if (result.success) {
        toast.success("Dokumen diperbarui");
        onClose();
      } else {
        setError(result.error ?? "Terjadi kesalahan");
      }
    });
  }

  return (
    <ModalShell title="Edit Dokumen" onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <FormField label="Judul *">
          <input name="title" required defaultValue={doc.title} className="form-input" />
        </FormField>
        <FormField label="Deskripsi">
          <textarea
            name="description"
            rows={3}
            defaultValue={doc.description ?? ""}
            className="form-input resize-none"
          />
        </FormField>
        <FormField label="Status">
          <select name="status" defaultValue={doc.status} className="form-input">
            <option value="DRAFT">Draft</option>
            <option value="SENT">Terkirim</option>
            <option value="IN_PROGRESS">Proses</option>
            <option value="COMPLETED">Selesai</option>
            <option value="CANCELLED">Dibatalkan</option>
          </select>
        </FormField>
        {error && <ErrorBox message={error} />}
        <FormFooter onClose={onClose} isPending={isPending} submitLabel="Simpan Perubahan" />
      </form>
    </ModalShell>
  );
}

/* ─── Detail Modal ─── */

function DetailModal({
  doc,
  isOwner,
  myEmail,
  onClose,
}: {
  doc: DocumentItem;
  isOwner: boolean;
  myEmail: string | null;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [showAddRecipient, setShowAddRecipient] = useState(false);

  const cfg = DOC_STATUS[doc.status] ?? DOC_STATUS.DRAFT;
  const isDraft = doc.status === "DRAFT";

  // Find current teacher's recipient row
  const myRecipient = myEmail
    ? doc.recipients.find((r) => r.email?.toLowerCase() === myEmail.toLowerCase())
    : null;

  function handleSend() {
    startTransition(async () => {
      const result = await sendDocument(doc.id);
      if (result.success) {
        toast.success("Dokumen dikirim");
        onClose();
      } else {
        toast.error(result.error ?? "Gagal mengirim");
      }
    });
  }

  function handleRemoveRecipient(recipientId: string) {
    startTransition(async () => {
      const result = await removeRecipient(recipientId);
      if (result.success) {
        toast.success("Penerima dihapus");
        onClose();
      } else {
        toast.error(result.error ?? "Gagal");
      }
    });
  }

  return (
    <ModalShell title={doc.title} onClose={onClose} maxWidth="max-w-2xl">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>
            {cfg.icon}
            {cfg.label}
          </span>
          <span className="text-xs text-gray-400">·</span>
          <span className="text-xs text-gray-500">Dibuat oleh {doc.creatorName}</span>
          <span className="text-xs text-gray-400">·</span>
          <span className="text-xs text-gray-500">{formatDate(doc.createdAt)}</span>
        </div>
        {doc.description && <p className="text-sm text-gray-600">{doc.description}</p>}
        <a
          href={doc.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-[#0d5c63] hover:underline"
        >
          <ExternalLink size={12} />
          Buka File Dokumen
        </a>
        {doc.signedUrl && (
          <a
            href={doc.signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-2 ml-3 text-xs font-medium text-teal-600 hover:underline"
          >
            <CheckCircle2 size={12} />
            File Hasil Tanda Tangan
          </a>
        )}
      </div>

      {/* "For me" — sign banner */}
      {!isOwner && myRecipient && myRecipient.status !== "SIGNED" && (doc.status === "SENT" || doc.status === "IN_PROGRESS") && (
        <div className="px-6 py-3 bg-amber-50 border-b border-amber-100">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-900">Anda perlu menandatangani dokumen ini</p>
              <p className="text-xs text-amber-700 mt-0.5">Sebagai {RECIPIENT_ROLE[myRecipient.role]}</p>
            </div>
            {myRecipient.token && (
              <a
                href={`/sign/${myRecipient.token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-colors shrink-0"
              >
                Tanda Tangani
              </a>
            )}
          </div>
        </div>
      )}

      {/* Recipients */}
      <div className="px-6 py-4 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <UsersIcon size={14} />
            Penerima ({doc.recipients.length})
          </h3>
          {isOwner && isDraft && (
            <button
              onClick={() => setShowAddRecipient(true)}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#0d5c63] hover:underline"
            >
              <UserPlus size={12} />
              Tambah
            </button>
          )}
        </div>

        {doc.recipients.length > 0 ? (
          <div className="space-y-2">
            {doc.recipients.map((r) => {
              const sCfg = SIGN_STATUS[r.status] ?? SIGN_STATUS.PENDING;
              return (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/30">
                  <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-gray-500">
                      {r.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 truncate">{r.name}</p>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        {RECIPIENT_ROLE[r.role] ?? r.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {r.email && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                          <Mail size={10} />
                          {r.email}
                        </span>
                      )}
                      {r.phone && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                          <Phone size={10} />
                          {r.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sCfg.color} shrink-0`}>
                    {sCfg.label}
                  </span>
                  {isOwner && isDraft && (
                    <button
                      onClick={() => handleRemoveRecipient(r.id)}
                      disabled={isPending}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                      title="Hapus penerima"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-gray-400">Belum ada penerima</div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          Tutup
        </button>
        {isOwner && isDraft && doc.recipients.length > 0 && (
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

      {showAddRecipient && (
        <AddRecipientModal documentId={doc.id} onClose={() => setShowAddRecipient(false)} />
      )}
    </ModalShell>
  );
}

/* ─── Add Recipient Modal ─── */

function AddRecipientModal({ documentId, onClose }: { documentId: string; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    formData.set("documentId", documentId);
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
    <ModalShell title="Tambah Penerima" onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <FormField label="Nama *">
          <input name="name" required placeholder="Nama lengkap" className="form-input" />
        </FormField>
        <FormField label="Peran *">
          <select name="role" required defaultValue="" className="form-input">
            <option value="" disabled>Pilih peran</option>
            <option value="KEPALA_SEKOLAH">Kepala Sekolah</option>
            <option value="WALI_KELAS">Wali Kelas</option>
            <option value="GURU">Guru</option>
            <option value="ORANG_TUA">Orang Tua</option>
            <option value="MURID">Murid</option>
          </select>
        </FormField>
        <FormField label="Email">
          <input name="email" type="email" placeholder="email@contoh.com" className="form-input" />
        </FormField>
        <FormField label="Telepon">
          <input name="phone" placeholder="08xxxxxxxxxx" className="form-input" />
        </FormField>
        {error && <ErrorBox message={error} />}
        <FormFooter onClose={onClose} isPending={isPending} submitLabel="Tambah" />
      </form>
    </ModalShell>
  );
}

/* ─── Delete Modal ─── */

function DeleteModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteDocument(id);
      if (result.success) {
        toast.success("Dokumen dihapus");
        onClose();
      } else {
        toast.error(result.error ?? "Gagal");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle size={22} className="text-red-500" />
          </div>
          <h3 className="text-base font-bold text-gray-900">Hapus Dokumen?</h3>
          <p className="text-sm text-gray-500 mt-1">
            Dokumen beserta penerima dan tanda tangan akan dihapus permanen.
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

/* ─── Reusable UI ─── */

function ModalShell({
  title,
  onClose,
  children,
  maxWidth = "max-w-md",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-xl w-full ${maxWidth} max-h-[90vh] overflow-hidden flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-bold text-gray-900 truncate pr-3">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
      <style jsx>{`
        :global(.form-input) {
          width: 100%;
          padding: 0.625rem 1rem;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
          background: #f9fafb;
          font-size: 0.875rem;
          outline: none;
          transition: all 0.15s;
        }
        :global(.form-input:focus) {
          border-color: #0d5c63;
          background: white;
          box-shadow: 0 0 0 2px rgba(13, 92, 99, 0.2);
        }
      `}</style>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{message}</div>
  );
}

function FormFooter({
  onClose,
  isPending,
  submitLabel,
}: {
  onClose: () => void;
  isPending: boolean;
  submitLabel: string;
}) {
  return (
    <div className="flex gap-3 pt-2">
      <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
        Batal
      </button>
      <button
        type="submit"
        disabled={isPending}
        className="flex-1 py-2.5 rounded-lg bg-[#0d5c63] text-white text-sm font-semibold hover:bg-[#0a4a50] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {isPending && <Loader2 size={14} className="animate-spin" />}
        {submitLabel}
      </button>
    </div>
  );
}
