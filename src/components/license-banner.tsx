// src/components/license-banner.tsx

import Link from "next/link";
import { AlertTriangle, ShieldAlert, ShieldCheck, ArrowRight } from "lucide-react";
import {
  expireStaleLicenses,
  getLicenseState,
  type LicenseState,
} from "@/lib/license/guard";

type Variant = "expired" | "soon" | "ok" | "none";

function variantOf(state: LicenseState): Variant {
  if (!state.hasLicense) return "none";
  if (state.isExpired) return "expired";
  if (state.isExpiringSoon) return "soon";
  return "ok";
}

const STYLES: Record<
  Exclude<Variant, "ok">,
  { wrapper: string; icon: React.ReactNode; title: (s: LicenseState) => string; body: (s: LicenseState) => string }
> = {
  expired: {
    wrapper: "bg-red-50 border-red-200 text-red-800",
    icon: <ShieldAlert size={18} className="text-red-600 shrink-0" />,
    title: (s) =>
      s.status === "BLOCKED"
        ? "Lisensi diblokir"
        : !s.hasLicense
        ? "Lisensi belum dipasang"
        : "Lisensi sudah kedaluwarsa",
    body: (s) =>
      `Pembuatan sesi absensi, penambahan siswa, kelas, dan pengguna telah dinonaktifkan${
        s.endsAt ? ` sejak ${s.endsAt.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}` : ""
      }. Aktivasi kunci lisensi untuk melanjutkan.`,
  },
  soon: {
    wrapper: "bg-amber-50 border-amber-200 text-amber-800",
    icon: <AlertTriangle size={18} className="text-amber-600 shrink-0" />,
    title: (s) =>
      s.status === "TRIAL"
        ? `Masa percobaan berakhir ${s.daysLeft} hari lagi`
        : `Lisensi berakhir ${s.daysLeft} hari lagi`,
    body: (s) =>
      `Aktivasi atau perpanjang lisensi sebelum ${
        s.endsAt?.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }) ?? "—"
      } untuk menghindari gangguan.`,
  },
  none: {
    wrapper: "bg-red-50 border-red-200 text-red-800",
    icon: <ShieldAlert size={18} className="text-red-600 shrink-0" />,
    title: () => "Lisensi belum dipasang",
    body: () =>
      "Tidak ada data lisensi. Hubungi administrator atau aktivasi kunci lisensi di Pengaturan.",
  },
};

/**
 * Server component banner. Renders only when there is something to say.
 * Place at top of dashboard pages.
 */
export async function LicenseBanner({ adminLink = false }: { adminLink?: boolean } = {}) {
  // Try to auto-expire on each render — cheap and keeps state honest.
  await expireStaleLicenses();
  const state = await getLicenseState();
  const variant = variantOf(state);
  if (variant === "ok") return null;

  const cfg = STYLES[variant];

  return (
    <div className={`rounded-2xl border px-4 py-3 flex items-start gap-3 ${cfg.wrapper}`}>
      {cfg.icon}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold">{cfg.title(state)}</p>
        <p className="text-xs mt-0.5 opacity-90">{cfg.body(state)}</p>
      </div>
      {adminLink && (
        <Link
          href="/admin/settings?tab=license"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/70 hover:bg-white text-xs font-semibold transition-colors shrink-0"
        >
          Aktivasi
          <ArrowRight size={12} />
        </Link>
      )}
    </div>
  );
}

/**
 * Compact "all good" badge — opt-in for a positive confirmation.
 * Not used by default to avoid noise.
 */
export async function LicenseOkBadge() {
  const state = await getLicenseState();
  if (variantOf(state) !== "ok") return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
      <ShieldCheck size={12} />
      Lisensi aktif · {state.daysLeft} hari tersisa
    </span>
  );
}
