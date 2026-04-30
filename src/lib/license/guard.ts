// src/lib/license/guard.ts
//
// License state derivation, auto-expiry, and write-action guard.

import { prisma } from "@/lib/db/prisma";

export type LicenseState = {
  hasLicense: boolean;
  status: "TRIAL" | "ACTIVE" | "EXPIRED" | "BLOCKED" | "NONE";
  endsAt: Date | null;
  daysLeft: number | null;
  isExpired: boolean;
  isExpiringSoon: boolean;        // <= 7 days left
  canWrite: boolean;              // false when EXPIRED/BLOCKED/NONE
  schoolName: string | null;
};

const SOON_THRESHOLD_DAYS = 7;

function endsAtFor(license: {
  status: string;
  trialEndsAt: Date;
  licenseEndsAt: Date | null;
}): Date {
  return license.status === "TRIAL"
    ? license.trialEndsAt
    : license.licenseEndsAt ?? license.trialEndsAt;
}

/**
 * Idempotently flip TRIAL/ACTIVE licenses whose end date has passed to EXPIRED.
 * Cheap to call — runs on each page load that surfaces license state.
 */
export async function expireStaleLicenses(): Promise<number> {
  const now = new Date();
  try {
    const result = await prisma.$executeRaw`
      UPDATE licenses
      SET status = 'EXPIRED', "updatedAt" = NOW()
      WHERE status IN ('TRIAL', 'ACTIVE')
        AND COALESCE("licenseEndsAt", "trialEndsAt") < ${now}
    `;
    return Number(result);
  } catch {
    return 0;
  }
}

/**
 * Get current license state with derived flags. Does NOT auto-expire — call
 * `expireStaleLicenses()` separately if you want that side-effect.
 */
export async function getLicenseState(): Promise<LicenseState> {
  const license = await prisma.license.findFirst({
    orderBy: { createdAt: "desc" },
  });

  if (!license) {
    return {
      hasLicense: false,
      status: "NONE",
      endsAt: null,
      daysLeft: null,
      isExpired: true,
      isExpiringSoon: false,
      canWrite: false,
      schoolName: null,
    };
  }

  const endsAt = endsAtFor(license);
  const now = new Date();
  const msLeft = endsAt.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));

  const isExpired =
    license.status === "EXPIRED" ||
    license.status === "BLOCKED" ||
    msLeft < 0;

  const isActive = license.status === "TRIAL" || license.status === "ACTIVE";
  const isExpiringSoon = isActive && !isExpired && daysLeft <= SOON_THRESHOLD_DAYS;

  return {
    hasLicense: true,
    status: license.status as LicenseState["status"],
    endsAt,
    daysLeft,
    isExpired,
    isExpiringSoon,
    canWrite: !isExpired && (license.status === "TRIAL" || license.status === "ACTIVE"),
    schoolName: license.schoolName,
  };
}

/**
 * Throw if license forbids write actions (EXPIRED/BLOCKED/NONE).
 * Use at the top of mutation server actions: createSession, addStudent, etc.
 */
export class LicenseExpiredError extends Error {
  code = "LICENSE_EXPIRED" as const;
  constructor(message = "Lisensi sudah kedaluwarsa atau diblokir. Silakan aktivasi ulang di Pengaturan.") {
    super(message);
  }
}

export async function requireActiveLicense(): Promise<void> {
  // Auto-expire first so a stale TRIAL gets blocked even if no one visited
  // settings/dashboard yet today.
  await expireStaleLicenses();
  const state = await getLicenseState();
  if (!state.canWrite) {
    throw new LicenseExpiredError();
  }
}
