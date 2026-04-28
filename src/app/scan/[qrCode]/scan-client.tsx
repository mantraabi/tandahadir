"use client";

// src/app/scan/[qrCode]/scan-client.tsx

import { useState, useEffect, useTransition, useRef } from "react";
import {
  QrCode,
  Search,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Clock,
  GraduationCap,
  School,
  User,
  XCircle,
} from "lucide-react";
import { searchStudents, submitAttendance } from "./actions";

type Props = {
  qrCode: string;
  session: {
    id: string;
    className: string;
    subject: string | null;
    teacherName: string;
    schoolName: string;
    qrExpiresAt: string;
    requiresGeo: boolean;
  };
};

type Student = {
  id: string;
  name: string;
  nisn: string | null;
  nis: string | null;
  alreadyAttended: boolean;
};

type SuccessData = {
  studentName: string;
  className: string;
  subject: string | null;
  status: string;
  time: string;
};

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function ScanClient({ qrCode, session }: Props) {
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Student | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<SuccessData | null>(null);
  const [geo, setGeo] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "ready" | "denied">("idle");
  const [isPending, startTransition] = useTransition();

  // Countdown
  const [timeLeft, setTimeLeft] = useState("");
  const [expired, setExpired] = useState(false);

  // Debounce ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Geolocation (watch + take best of multiple readings) ───
  useEffect(() => {
    if (!session.requiresGeo) return;
    setGeoStatus("loading");
    if (!("geolocation" in navigator)) {
      setGeoStatus("denied");
      return;
    }

    let best: GeolocationPosition | null = null;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!best || pos.coords.accuracy < best.coords.accuracy) {
          best = pos;
        }
        setGeo({
          latitude: best.coords.latitude,
          longitude: best.coords.longitude,
          accuracy: best.coords.accuracy,
        });
        setGeoStatus("ready");
      },
      () => setGeoStatus("denied"),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    // Stop watching after 30s to save battery
    const stopId = setTimeout(() => navigator.geolocation.clearWatch(watchId), 30000);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearTimeout(stopId);
    };
  }, [session.requiresGeo]);

  // ─── Countdown ───
  useEffect(() => {
    function update() {
      const now = Date.now();
      const exp = new Date(session.qrExpiresAt).getTime();
      const diff = exp - now;
      if (diff <= 0) {
        setExpired(true);
        setTimeLeft("Kedaluwarsa");
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, "0")}`);
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [session.qrExpiresAt]);

  // ─── Debounced search ───
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (search.trim().length < 2) {
      setStudents([]);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const result = await searchStudents(qrCode, search);
      if (result.success) {
        setStudents(result.data ?? []);
      } else {
        setStudents([]);
      }
      setSearching(false);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, qrCode]);

  function handleSelect(student: Student) {
    if (student.alreadyAttended) {
      setError("Siswa ini sudah melakukan absensi");
      return;
    }
    setSelected(student);
    setShowConfirm(true);
    setError("");
  }

  function handleSubmit() {
    if (!selected) return;
    setError("");
    setShowConfirm(false);
    startTransition(async () => {
      const result = await submitAttendance(qrCode, selected.id, geo);
      if (result.success) {
        setSuccess(result.data as SuccessData);
      } else {
        setError(result.error ?? "Gagal mencatat kehadiran");
        setSelected(null);
      }
    });
  }

  // ─── Success ───
  if (success) {
    return (
      <div className="min-h-screen bg-[#f8f6f1] flex flex-col">
        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <div className="w-20 h-20 rounded-3xl bg-teal-50 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 size={36} className="text-teal-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Absensi Berhasil!</h1>
              <p className="text-sm text-gray-500 mb-6">
                Kehadiran Anda telah tercatat sebagai{" "}
                <span className="font-semibold text-teal-600">
                  {success.status === "PRESENT" ? "Hadir" : success.status}
                </span>
              </p>
              <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2.5">
                <Field icon={<User size={12} />} label="Nama" value={success.studentName} />
                <Field icon={<GraduationCap size={12} />} label="Kelas" value={success.className} />
                {success.subject && <Field icon={<School size={12} />} label="Mata Pelajaran" value={success.subject} />}
                <Field icon={<Clock size={12} />} label="Waktu" value={formatDateTime(success.time)} />
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

  // ─── Expired ───
  if (expired) {
    return (
      <ErrorScreen
        title="QR Code Kedaluwarsa"
        message="Sesi absensi ini telah berakhir. Silakan minta guru untuk membuka sesi baru."
      />
    );
  }

  // ─── Main UI ───
  return (
    <div className="min-h-screen bg-[#f8f6f1]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-[#0d5c63] rounded-xl flex items-center justify-center">
            <QrCode size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-900 text-base truncate">Absensi QR</h1>
            <p className="text-xs text-gray-400 truncate">{session.schoolName}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-600">
              <Clock size={11} />
              <span className="text-xs font-bold tabular-nums">{timeLeft}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-5 space-y-5">
        {/* Session Info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-base font-bold text-gray-900 mb-3">Informasi Sesi</h2>
          <div className="space-y-2 text-sm">
            <Field icon={<GraduationCap size={13} />} label="Kelas" value={session.className} />
            {session.subject && <Field icon={<School size={13} />} label="Mata Pelajaran" value={session.subject} />}
            <Field icon={<User size={13} />} label="Guru" value={session.teacherName} />
          </div>
        </div>

        {/* Geolocation Status */}
        {session.requiresGeo && (
          <div
            className={`rounded-2xl border p-4 flex items-start gap-3 ${
              geoStatus === "ready"
                ? "bg-teal-50 border-teal-100"
                : geoStatus === "denied"
                ? "bg-red-50 border-red-100"
                : "bg-amber-50 border-amber-100"
            }`}
          >
            <MapPin
              size={18}
              className={
                geoStatus === "ready"
                  ? "text-teal-600"
                  : geoStatus === "denied"
                  ? "text-red-500"
                  : "text-amber-600"
              }
            />
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900 flex items-center gap-2 flex-wrap">
                {geoStatus === "ready" && (
                  <>
                    Lokasi terdeteksi
                    {geo && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/70 text-gray-600">
                        ±{Math.round(geo.accuracy)}m
                      </span>
                    )}
                  </>
                )}
                {geoStatus === "loading" && "Mendeteksi lokasi..."}
                {geoStatus === "denied" && "Akses lokasi ditolak"}
                {geoStatus === "idle" && "Memverifikasi lokasi"}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {geoStatus === "denied"
                  ? "Aktifkan izin lokasi pada browser Anda untuk melanjutkan"
                  : geoStatus === "loading"
                  ? "Tunggu sebentar, GPS sedang dikalibrasi..."
                  : geo && geo.accuracy > 100
                  ? "Akurasi rendah. Coba pindah ke luar ruangan / dekat jendela, lalu tunggu beberapa detik"
                  : "Sesi ini memerlukan verifikasi lokasi GPS"}
              </p>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Cari Nama Anda
          </label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nama lengkap, NISN, atau NIS"
              className="w-full pl-10 pr-10 py-3 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
              autoFocus
            />
            {searching && (
              <Loader2
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin"
              />
            )}
          </div>

          {/* Results */}
          {students.length > 0 && (
            <div className="mt-3 border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50">
              {students.map((student) => (
                <button
                  key={student.id}
                  onClick={() => handleSelect(student)}
                  disabled={student.alreadyAttended}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-blue-600">
                      {student.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{student.name}</p>
                    <p className="text-[10px] text-gray-400">
                      {student.nis ? `NIS: ${student.nis}` : student.nisn ? `NISN: ${student.nisn}` : ""}
                    </p>
                  </div>
                  {student.alreadyAttended ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-600 shrink-0">
                      Sudah Hadir
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-[#0d5c63] shrink-0">
                      Pilih →
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {search.trim().length >= 2 && !searching && students.length === 0 && (
            <p className="mt-3 text-center text-sm text-gray-400 py-6">
              Tidak ada siswa ditemukan
            </p>
          )}

          {search.trim().length < 2 && (
            <p className="mt-2 text-xs text-gray-400">
              Masukkan minimal 2 karakter untuk mencari
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
            <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <p className="text-center text-[11px] text-gray-400 pb-4">
          Pastikan nama yang Anda pilih adalah nama Anda sendiri.
        </p>
      </main>

      {/* Confirm Modal */}
      {showConfirm && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-2xl bg-[#0d5c63]/10 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={22} className="text-[#0d5c63]" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Konfirmasi Kehadiran</h3>
              <p className="text-sm text-gray-500 mt-2">Anda akan menandai kehadiran sebagai:</p>
              <p className="text-base font-bold text-gray-900 mt-3">{selected.name}</p>
              <p className="text-xs text-gray-400">
                {selected.nis ? `NIS: ${selected.nis}` : selected.nisn ? `NISN: ${selected.nisn}` : ""}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending || (session.requiresGeo && geoStatus !== "ready")}
                className="flex-1 py-2.5 rounded-lg bg-[#0d5c63] text-white text-sm font-semibold hover:bg-[#0a4a50] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isPending && <Loader2 size={14} className="animate-spin" />}
                Ya, Hadir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending overlay */}
      {isPending && !showConfirm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl px-6 py-4 flex items-center gap-3">
            <Loader2 size={20} className="animate-spin text-[#0d5c63]" />
            <p className="text-sm font-medium text-gray-700">Menyimpan kehadiran...</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Helpers ─── */

function Field({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-400 shrink-0">{icon}</span>
      <span className="text-xs text-gray-400 shrink-0">{label}:</span>
      <span className="text-sm font-medium text-gray-700 truncate">{value}</span>
    </div>
  );
}

function ErrorScreen({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen bg-[#f8f6f1] flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 rounded-3xl bg-red-50 flex items-center justify-center mx-auto mb-6">
            <XCircle size={36} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
          <p className="text-sm text-gray-500">{message}</p>
        </div>
      </main>
    </div>
  );
}

