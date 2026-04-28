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
} from "lucide-react";
import { toast } from "sonner";
import { updateSchoolProfile, changePassword, updateAdminProfile } from "./actions";

export type SchoolData = {
  id: string | null;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  principal: string | null;
  npsn: string | null;
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
