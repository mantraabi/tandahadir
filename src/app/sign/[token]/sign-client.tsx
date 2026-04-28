"use client";

// src/app/sign/[token]/sign-client.tsx

import { useState, useRef, useEffect, useTransition } from "react";
import SignatureCanvas from "react-signature-canvas";
import {
  FileText,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
  RotateCcw,
  AlertTriangle,
  PenLine,
  Calendar,
  User,
} from "lucide-react";
import { submitSignature, declineSignature, markOpened } from "./actions";

type Props = {
  token: string;
  recipient: {
    id: string;
    name: string;
    role: string;
    status: string;
    signedAt: string | null;
  };
  document: {
    id: string;
    title: string;
    description: string | null;
    fileUrl: string;
    creatorName: string;
    schoolName: string;
    createdAt: string;
  };
};

const ROLE_LABEL: Record<string, string> = {
  ORANG_TUA: "Orang Tua",
  GURU: "Guru",
  MURID: "Murid",
  WALI_KELAS: "Wali Kelas",
  KEPALA_SEKOLAH: "Kepala Sekolah",
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function SignClient({ token, recipient, document: doc }: Props) {
  const sigCanvasRef = useRef<SignatureCanvas | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const [success, setSuccess] = useState(recipient.status === "SIGNED");
  const [declined, setDeclined] = useState(recipient.status === "DECLINED");

  // Mark as opened on first load
  useEffect(() => {
    if (recipient.status === "PENDING") {
      void markOpened(token);
    }
  }, [token, recipient.status]);

  function clearCanvas() {
    sigCanvasRef.current?.clear();
  }

  function handleSubmit() {
    setError("");

    if (!agreed) {
      setError("Anda harus menyetujui pernyataan terlebih dahulu");
      return;
    }

    const canvas = sigCanvasRef.current;
    if (!canvas || canvas.isEmpty()) {
      setError("Mohon tanda tangani di area yang disediakan");
      return;
    }

    const dataUrl = canvas.toDataURL("image/png");

    startTransition(async () => {
      const result = await submitSignature(token, dataUrl);
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error ?? "Gagal menyimpan tanda tangan");
      }
    });
  }

  function handleDecline() {
    setShowDeclineConfirm(false);
    startTransition(async () => {
      const result = await declineSignature(token);
      if (result.success) {
        setDeclined(true);
      } else {
        setError(result.error ?? "Gagal mencatat penolakan");
      }
    });
  }

  // ─── Success state ───
  if (success) {
    return (
      <SuccessScreen
        title="Berhasil Ditandatangani"
        message="Terima kasih. Tanda tangan Anda telah tersimpan."
        doc={doc}
        recipient={recipient}
        variant="success"
      />
    );
  }

  // ─── Declined state ───
  if (declined) {
    return (
      <SuccessScreen
        title="Anda Telah Menolak"
        message="Penolakan tanda tangan telah dicatat. Pembuat dokumen akan diberitahu."
        doc={doc}
        recipient={recipient}
        variant="decline"
      />
    );
  }

  // ─── Sign UI ───
  return (
    <div className="min-h-screen bg-[#f8f6f1]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-[#0d5c63] rounded-xl flex items-center justify-center">
            <PenLine size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-base">Tanda Tangan Dokumen</h1>
            <p className="text-xs text-gray-400">{doc.schoolName}</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Document Card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#0d5c63]/10 flex items-center justify-center shrink-0">
              <FileText size={22} className="text-[#0d5c63]" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900">{doc.title}</h2>
              {doc.description && (
                <p className="text-sm text-gray-500 mt-1">{doc.description}</p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 mt-4 text-xs">
                <InfoRow icon={<User size={12} />} label="Pembuat" value={doc.creatorName} />
                <InfoRow icon={<Calendar size={12} />} label="Tanggal" value={formatDate(doc.createdAt)} />
              </div>

              <a
                href={doc.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-4 px-3 py-2 rounded-lg bg-[#0d5c63]/10 text-[#0d5c63] text-xs font-semibold hover:bg-[#0d5c63]/20 transition-colors"
              >
                <ExternalLink size={12} />
                Buka Dokumen
              </a>
            </div>
          </div>
        </div>

        {/* Recipient Card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Penerima</h3>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-blue-600">
                {recipient.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{recipient.name}</p>
              <p className="text-xs text-gray-500">{ROLE_LABEL[recipient.role] ?? recipient.role}</p>
            </div>
          </div>
        </div>

        {/* Signature Pad */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900">Tanda Tangan Anda</h3>
            <button
              onClick={clearCanvas}
              type="button"
              className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-[#0d5c63] transition-colors"
            >
              <RotateCcw size={12} />
              Hapus
            </button>
          </div>

          <div className="border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/30 overflow-hidden touch-none">
            <SignatureCanvas
              ref={(ref: SignatureCanvas | null) => {
                sigCanvasRef.current = ref;
              }}
              penColor="#0d5c63"
              backgroundColor="rgb(255, 255, 255)"
              canvasProps={{
                className: "w-full h-48 sm:h-56 cursor-crosshair",
              }}
            />
          </div>

          <p className="text-[11px] text-gray-400 mt-2 text-center">
            Gunakan jari atau mouse untuk menandatangani di area di atas
          </p>
        </div>

        {/* Agreement */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#0d5c63] focus:ring-[#0d5c63]"
            />
            <span className="text-sm text-gray-700 leading-relaxed">
              Saya menyatakan bahwa tanda tangan di atas adalah benar tanda tangan saya, dan saya
              setuju dengan isi dokumen ini. Tanda tangan elektronik ini memiliki kekuatan hukum
              yang sama dengan tanda tangan basah.
            </span>
          </label>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
            <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setShowDeclineConfirm(true)}
            disabled={isPending}
            className="sm:flex-1 py-3 rounded-xl border border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <XCircle size={16} />
            Tolak Tanda Tangan
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="sm:flex-[2] py-3 rounded-xl bg-[#0d5c63] text-white text-sm font-semibold hover:bg-[#0a4a50] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Tanda Tangani Dokumen
          </button>
        </div>

        <p className="text-center text-[11px] text-gray-400 pb-4">
          Dengan menandatangani, alamat IP dan informasi browser Anda akan dicatat sebagai bukti.
        </p>
      </main>

      {/* Decline Confirm Modal */}
      {showDeclineConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowDeclineConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle size={22} className="text-red-500" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Tolak Tanda Tangan?</h3>
              <p className="text-sm text-gray-500 mt-1">
                Tindakan ini tidak dapat dibatalkan. Pembuat dokumen akan diberitahu.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeclineConfirm(false)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDecline}
                disabled={isPending}
                className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-60"
              >
                Ya, Tolak
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Success Screen ─── */

function SuccessScreen({
  title,
  message,
  doc,
  recipient,
  variant,
}: {
  title: string;
  message: string;
  doc: Props["document"];
  recipient: Props["recipient"];
  variant: "success" | "decline";
}) {
  const isSuccess = variant === "success";
  return (
    <div className="min-h-screen bg-[#f8f6f1] flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <div
              className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 ${
                isSuccess ? "bg-teal-50" : "bg-red-50"
              }`}
            >
              {isSuccess ? (
                <CheckCircle2 size={36} className="text-teal-600" />
              ) : (
                <XCircle size={36} className="text-red-500" />
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">{title}</h1>
            <p className="text-sm text-gray-500 mb-6">{message}</p>

            <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 mb-1">
              <div>
                <p className="text-[10px] font-medium text-gray-400 uppercase">Dokumen</p>
                <p className="text-sm font-semibold text-gray-900">{doc.title}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-gray-400 uppercase">Penandatangan</p>
                <p className="text-sm font-medium text-gray-700">
                  {recipient.name} · {ROLE_LABEL[recipient.role] ?? recipient.role}
                </p>
              </div>
              {recipient.signedAt && (
                <div>
                  <p className="text-[10px] font-medium text-gray-400 uppercase">Waktu</p>
                  <p className="text-sm font-medium text-gray-700">{formatDateTime(recipient.signedAt)}</p>
                </div>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Anda dapat menutup halaman ini.
          </p>
        </div>
      </main>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-gray-400">{icon}</span>
      <span className="text-gray-400">{label}:</span>
      <span className="font-medium text-gray-700 truncate">{value}</span>
    </div>
  );
}
