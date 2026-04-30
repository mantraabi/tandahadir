"use client";

// src/app/(dashboard)/admin/settings/settings-client.tsx

import { useState, useTransition } from "react";
import {
  School,
  User,
  Lock,
  Save,
  Loader2,
  Building2,
  Phone,
  Mail,
  MapPin,
  Shield,
  Eye,
  EyeOff,
  Hash,
  Crosshair,
  Check,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { updateSchoolProfile, changePassword, updateAdminProfile, activateLicense } from "./actions";
import { KeyRound } from "lucide-react";

export type SchoolData = {
  id: string | null;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  principal: string | null;
  npsn: string | null;
  latitude: number | null;
  longitude: number | null;
  defaultRadius: number | null;
};

export type AdminData = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  lastLoginAt: string | null;
};

export type LicenseData = {
  key: string;
  status: string;
  schoolName: string;
  trialEndsAt: string;
  licenseEndsAt: string | null;
};

type Props = {
  school: SchoolData;
  admin: AdminData;
  license: LicenseData | null;
};

type Tab = "school" | "profile" | "password" | "license";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "school", label: "Profil Sekolah", icon: <Building2 size={16} /> },
  { key: "profile", label: "Akun Admin", icon: <User size={16} /> },
  { key: "password", label: "Ubah Password", icon: <Lock size={16} /> },
  { key: "license", label: "Lisensi", icon: <Shield size={16} /> },
];

const LICENSE_STATUS_LABEL: Record<string, string> = {
  TRIAL: "Masa Percobaan",
  ACTIVE: "Aktif",
  EXPIRED: "Kedaluwarsa",
  BLOCKED: "Diblokir",
};

const LICENSE_STATUS_COLOR: Record<string, string> = {
  TRIAL: "bg-amber-50 text-amber-600",
  ACTIVE: "bg-green-50 text-green-600",
  EXPIRED: "bg-red-50 text-red-500",
  BLOCKED: "bg-red-50 text-red-500",
};

function formatDate(d: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(d));
}

export function SettingsClient({ school, admin, license }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("school");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan</h1>
        <p className="text-sm text-gray-500 mt-1">
          Kelola profil sekolah, akun, dan pengaturan sistem
        </p>
      </div>

      {/* Tabs + Content */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:w-56 shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 p-2 flex lg:flex-col gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? "bg-[#0d5c63] text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeTab === "school" && <SchoolProfileForm school={school} />}
          {activeTab === "profile" && <AdminProfileForm admin={admin} />}
          {activeTab === "password" && <ChangePasswordForm />}
          {activeTab === "license" && <LicenseInfo license={license} />}
        </div>
      </div>
    </div>
  );
}

/* ─── School Profile Form ─── */

function SchoolProfileForm({ school }: { school: SchoolData }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateSchoolProfile(formData);
      if (result.success) {
        toast.success("Profil sekolah berhasil disimpan");
      } else {
        setError(result.error ?? "Terjadi kesalahan");
      }
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <Building2 size={18} className="text-[#0d5c63]" />
          Profil Sekolah
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Informasi dasar tentang sekolah
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Nama Sekolah *
          </label>
          <input
            name="name"
            type="text"
            defaultValue={school.name}
            required
            placeholder="Nama sekolah"
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              NPSN
            </label>
            <input
              name="npsn"
              type="text"
              defaultValue={school.npsn ?? ""}
              placeholder="Nomor Pokok Sekolah Nasional"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Kepala Sekolah
            </label>
            <input
              name="principal"
              type="text"
              defaultValue={school.principal ?? ""}
              placeholder="Nama kepala sekolah"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email Sekolah
            </label>
            <input
              name="email"
              type="email"
              defaultValue={school.email ?? ""}
              placeholder="admin@sekolah.sch.id"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Telepon Sekolah
            </label>
            <input
              name="phone"
              type="text"
              defaultValue={school.phone ?? ""}
              placeholder="(021) xxxxxxx"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Alamat
          </label>
          <textarea
            name="address"
            rows={3}
            defaultValue={school.address ?? ""}
            placeholder="Alamat lengkap sekolah"
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all resize-none"
          />
        </div>

        <SchoolGeofenceSection
          initialLat={school.latitude}
          initialLng={school.longitude}
          initialRadius={school.defaultRadius}
        />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-2.5 rounded-lg bg-[#0d5c63] text-white text-sm font-semibold hover:bg-[#0a4a50] transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Simpan
          </button>
        </div>
      </form>
    </div>
  );
}

/* ─── Admin Profile Form ─── */

function AdminProfileForm({ admin }: { admin: AdminData }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateAdminProfile(formData);
      if (result.success) {
        toast.success("Profil admin berhasil disimpan");
      } else {
        setError(result.error ?? "Terjadi kesalahan");
      }
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <User size={18} className="text-[#0d5c63]" />
          Akun Admin
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Ubah informasi akun administrator
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
          <div className="w-14 h-14 rounded-2xl bg-[#0d5c63] text-white flex items-center justify-center text-lg font-bold shrink-0">
            {admin.name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-gray-900">{admin.name}</p>
            <p className="text-xs text-gray-400">
              {admin.role === "ADMIN" ? "Administrator" : "Guru"} · Login terakhir:{" "}
              {admin.lastLoginAt ? formatDate(admin.lastLoginAt) : "-"}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Nama Lengkap *
          </label>
          <input
            name="name"
            type="text"
            defaultValue={admin.name}
            required
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email *
            </label>
            <input
              name="email"
              type="email"
              defaultValue={admin.email}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Telepon
            </label>
            <input
              name="phone"
              type="text"
              defaultValue={admin.phone ?? ""}
              placeholder="08xxxxxxxxxx"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-2.5 rounded-lg bg-[#0d5c63] text-white text-sm font-semibold hover:bg-[#0a4a50] transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Simpan
          </button>
        </div>
      </form>
    </div>
  );
}

/* ─── Change Password Form ─── */

function ChangePasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await changePassword(formData);
      if (result.success) {
        toast.success("Password berhasil diubah");
        e.currentTarget?.reset();
      } else {
        setError(result.error ?? "Terjadi kesalahan");
      }
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <Lock size={18} className="text-[#0d5c63]" />
          Ubah Password
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Ganti password akun admin
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Password Saat Ini *
          </label>
          <div className="relative">
            <input
              name="currentPassword"
              type={showCurrent ? "text" : "password"}
              required
              placeholder="Masukkan password saat ini"
              className="w-full px-4 py-2.5 pr-11 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Password Baru *
          </label>
          <div className="relative">
            <input
              name="newPassword"
              type={showNew ? "text" : "password"}
              required
              placeholder="Minimal 6 karakter"
              className="w-full px-4 py-2.5 pr-11 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Konfirmasi Password Baru *
          </label>
          <input
            name="confirmPassword"
            type="password"
            required
            placeholder="Ulangi password baru"
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-2.5 rounded-lg bg-[#0d5c63] text-white text-sm font-semibold hover:bg-[#0a4a50] transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
            Ubah Password
          </button>
        </div>
      </form>
    </div>
  );
}

/* ─── License Info ─── */

function LicenseInfo({ license }: { license: LicenseData | null }) {
  if (!license) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
            <Shield size={20} className="text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700">Tidak ada data lisensi</p>
          <p className="text-xs text-gray-400 mt-1">Hubungi administrator sistem</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <Shield size={18} className="text-[#0d5c63]" />
          Informasi Lisensi
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Detail lisensi penggunaan TandaHadir
        </p>
      </div>

      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <div className="w-12 h-12 rounded-2xl bg-[#0d5c63] text-white flex items-center justify-center shrink-0">
            <Shield size={22} />
          </div>
          <div>
            <p className="font-bold text-gray-900">{license.schoolName}</p>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                LICENSE_STATUS_COLOR[license.status] ?? "bg-gray-50 text-gray-600"
              }`}
            >
              {LICENSE_STATUS_LABEL[license.status] ?? license.status}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <InfoRow label="Kode Lisensi" value={maskKey(license.key)} mono />
          <InfoRow label="Status" value={LICENSE_STATUS_LABEL[license.status] ?? license.status} />
          <InfoRow label="Masa Percobaan Berakhir" value={formatDate(license.trialEndsAt)} />
          {license.licenseEndsAt && (
            <InfoRow label="Lisensi Berakhir" value={formatDate(license.licenseEndsAt)} />
          )}
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mt-4">
          <p className="text-xs text-blue-700">
            Untuk perpanjangan atau upgrade lisensi, hubungi tim TandaHadir.
          </p>
        </div>
      </div>

      {/* Activation form */}
      <div className="px-6 pb-6">
        <LicenseActivateForm />
      </div>
    </div>
  );
}

/* ─── License Activation Form ─── */

function LicenseActivateForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await activateLicense(formData);
      if (result.success) {
        toast.success("Lisensi berhasil diaktivasi");
        // Reload to refresh license state across the app
        setTimeout(() => window.location.reload(), 500);
      } else {
        setError(result.error ?? "Gagal mengaktivasi");
      }
    });
  }

  return (
    <div className="border-t border-gray-100 pt-5">
      <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
        <KeyRound size={14} className="text-[#0d5c63]" />
        Aktivasi Kunci Lisensi
      </h3>
      <p className="text-xs text-gray-400 mt-1">
        Masukkan kunci lisensi yang diberikan oleh tim TandaHadir untuk mengaktifkan atau memperpanjang langganan.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <input
          name="key"
          type="text"
          required
          autoComplete="off"
          spellCheck={false}
          placeholder="TH-XXXXXXXX-YYYYMMDD-XXXXXXXXXX"
          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm font-mono outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all uppercase tracking-wider"
        />
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2 rounded-lg bg-[#0d5c63] text-white text-sm font-semibold hover:bg-[#0a4a50] transition-colors disabled:opacity-60 inline-flex items-center gap-2"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
          Aktivasi
        </button>
      </form>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-medium text-gray-900 ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function maskKey(key: string) {
  if (key.length <= 8) return key;
  return key.slice(0, 4) + "••••••••" + key.slice(-4);
}

/* ─── School Geofence Section ─── */

function SchoolGeofenceSection({
  initialLat,
  initialLng,
  initialRadius,
}: {
  initialLat: number | null;
  initialLng: number | null;
  initialRadius: number | null;
}) {
  const [lat, setLat] = useState<number | null>(initialLat);
  const [lng, setLng] = useState<number | null>(initialLng);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function detectLocation() {
    setError("");
    if (!("geolocation" in navigator)) {
      setError("Browser tidak mendukung geolocation");
      return;
    }
    setLoading(true);

    let best: GeolocationPosition | null = null;
    let count = 0;
    const target = 3;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        count++;
        if (!best || pos.coords.accuracy < best.coords.accuracy) {
          best = pos;
        }
        if (count >= target) {
          navigator.geolocation.clearWatch(watchId);
          if (best) {
            const b = best as GeolocationPosition;
            setLat(b.coords.latitude);
            setLng(b.coords.longitude);
            setAccuracy(b.coords.accuracy);
          }
          setLoading(false);
        }
      },
      (err) => {
        navigator.geolocation.clearWatch(watchId);
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError("Izin lokasi ditolak. Aktifkan di pengaturan browser.");
        } else if (err.code === err.TIMEOUT) {
          setError("Timeout mencari lokasi. Coba lagi.");
        } else {
          setError("Gagal mendapatkan lokasi");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    setTimeout(() => {
      if (count > 0 && best) {
        navigator.geolocation.clearWatch(watchId);
        const b = best as GeolocationPosition;
        setLat(b.coords.latitude);
        setLng(b.coords.longitude);
        setAccuracy(b.coords.accuracy);
        setLoading(false);
      }
    }, 12000);
  }

  function handleClear() {
    setLat(null);
    setLng(null);
    setAccuracy(null);
  }

  const hasCoords = lat != null && lng != null;
  const accClass =
    accuracy == null
      ? "text-teal-700 bg-teal-50 border-teal-100"
      : accuracy <= 30
      ? "text-teal-700 bg-teal-50 border-teal-100"
      : accuracy <= 100
      ? "text-amber-700 bg-amber-50 border-amber-100"
      : "text-red-700 bg-red-50 border-red-100";

  return (
    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#0d5c63]/10 flex items-center justify-center shrink-0">
          <MapPin size={16} className="text-[#0d5c63]" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-gray-900">Lokasi Sekolah (Geofence)</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Titik koordinat ini akan dipakai sebagai pusat radius absensi. Guru bisa langsung gunakan tanpa harus deteksi GPS tiap kali.
          </p>
        </div>
      </div>

      {/* Hidden inputs for form submission */}
      <input type="hidden" name="latitude" value={lat ?? ""} />
      <input type="hidden" name="longitude" value={lng ?? ""} />

      {!hasCoords ? (
        <button
          type="button"
          onClick={detectLocation}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-[#0d5c63]/10 text-[#0d5c63] text-sm font-semibold hover:bg-[#0d5c63]/20 transition-colors disabled:opacity-60"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Crosshair size={14} />}
          {loading ? "Mendeteksi lokasi..." : "Gunakan Lokasi Saya Sekarang"}
        </button>
      ) : (
        <div className={`border rounded-lg p-3 ${accClass}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-start gap-2 min-w-0">
              <Check size={14} className="mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold flex items-center gap-1.5 flex-wrap">
                  Lokasi tersimpan
                  {accuracy != null && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/60">
                      ±{Math.round(accuracy)}m
                    </span>
                  )}
                </p>
                <p className="text-[10px] font-mono opacity-80 mt-0.5">
                  {lat!.toFixed(6)}, {lng!.toFixed(6)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={detectLocation}
                className="text-[10px] font-medium hover:underline"
              >
                Ulangi
              </button>
              <span className="text-[10px] opacity-50">·</span>
              <button
                type="button"
                onClick={handleClear}
                className="text-[10px] font-medium hover:underline"
              >
                Hapus
              </button>
            </div>
          </div>
          {accuracy != null && accuracy > 100 && (
            <p className="text-[10px] mt-2 leading-relaxed">
              ⚠️ Akurasi rendah. Coba pindah dekat jendela / luar ruangan, atau pakai HP.
            </p>
          )}
        </div>
      )}

      {/* Manual input as fallback */}
      <details className="text-xs">
        <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
          Input manual (opsional)
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] text-gray-500 mb-1">Latitude</label>
            <input
              type="number"
              step="any"
              value={lat ?? ""}
              onChange={(e) => setLat(e.target.value === "" ? null : parseFloat(e.target.value))}
              placeholder="-6.200000"
              className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-mono outline-none focus:border-[#0d5c63] focus:ring-2 focus:ring-[#0d5c63]/20"
            />
          </div>
          <div>
            <label className="block text-[11px] text-gray-500 mb-1">Longitude</label>
            <input
              type="number"
              step="any"
              value={lng ?? ""}
              onChange={(e) => setLng(e.target.value === "" ? null : parseFloat(e.target.value))}
              placeholder="106.816666"
              className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-mono outline-none focus:border-[#0d5c63] focus:ring-2 focus:ring-[#0d5c63]/20"
            />
          </div>
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5">
          Tip: dapat koordinat dari{" "}
          <a
            href="https://www.google.com/maps"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Google Maps
          </a>{" "}
          → klik kanan pada lokasi sekolah → klik koordinat untuk menyalin.
        </p>
      </details>

      {/* Default radius */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Radius Default (meter)
        </label>
        <select
          name="defaultRadius"
          defaultValue={initialRadius?.toString() ?? "50"}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm outline-none focus:border-[#0d5c63] focus:ring-2 focus:ring-[#0d5c63]/20"
        >
          <option value="20">20m (sangat ketat — dalam kelas)</option>
          <option value="50">50m (rekomendasi — area kelas)</option>
          <option value="100">100m (gedung sekolah)</option>
          <option value="200">200m (longgar)</option>
          <option value="500">500m (sangat longgar)</option>
        </select>
        <p className="text-[11px] text-gray-400 mt-1">
          Default ini dipakai saat guru memilih &quot;Pakai Lokasi Sekolah&quot; tanpa override radius.
        </p>
      </div>

      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1.5">
          <AlertTriangle size={12} />
          {error}
        </p>
      )}
    </div>
  );
}
