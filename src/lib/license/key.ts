// src/lib/license/key.ts
//
// Offline license key generation & validation.
//
// Key format: TH-<RAND8>-<YYYYMMDD>-<SIG10>
//   - RAND8  : 8-char base32 nonce (uniqueness only)
//   - YYYYMMDD: expiry date (UTC) — when this license stops being ACTIVE
//   - SIG10  : first 10 hex chars of HMAC-SHA256(secret, "TH-RAND8-YYYYMMDD")
//
// Why this design:
//   - Self-contained — no central license server needed; sekolah offline pun bisa aktivasi
//   - Tamper-resistant — change any field invalidates signature
//   - Human-readable expiry — admin bisa lihat tanggal di key langsung

import { createHmac } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // base32 minus confusing chars
const RAND_LEN = 8;
const SIG_LEN = 10;

function getSecret(): string {
  const secret = process.env.LICENSE_SECRET || process.env.AUTH_SECRET || "";
  if (!secret) {
    throw new Error("LICENSE_SECRET or AUTH_SECRET must be set");
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex").slice(0, SIG_LEN);
}

function randomBlock(): string {
  let s = "";
  for (let i = 0; i < RAND_LEN; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return s;
}

function dateToYYYYMMDD(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function parseYYYYMMDD(s: string): Date | null {
  if (!/^\d{8}$/.test(s)) return null;
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(4, 6));
  const d = Number(s.slice(6, 8));
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  // End of day UTC so "expires today" still valid the entire day
  const date = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
  if (isNaN(date.getTime())) return null;
  return date;
}

/**
 * Generate a license key valid until the given expiry date.
 */
export function generateLicenseKey(expiresAt: Date): string {
  const rand = randomBlock();
  const dateStr = dateToYYYYMMDD(expiresAt);
  const payload = `TH-${rand}-${dateStr}`;
  const sig = sign(payload);
  return `${payload}-${sig}`;
}

export type LicenseKeyValidation =
  | { valid: true; expiresAt: Date }
  | { valid: false; reason: string };

/**
 * Validate a license key. Returns the parsed expiry date if valid.
 */
export function validateLicenseKey(key: string): LicenseKeyValidation {
  const trimmed = key.trim().toUpperCase();
  const parts = trimmed.split("-");
  if (parts.length !== 4) {
    return { valid: false, reason: "Format kunci tidak valid" };
  }
  const [prefix, rand, dateStr, sig] = parts;
  if (prefix !== "TH") {
    return { valid: false, reason: "Prefix kunci salah" };
  }
  if (rand.length !== RAND_LEN) {
    return { valid: false, reason: "Panjang nonce tidak sesuai" };
  }
  const expectedSig = sign(`${prefix}-${rand}-${dateStr}`);
  if (sig !== expectedSig.toUpperCase()) {
    return { valid: false, reason: "Tanda tangan tidak cocok (kunci palsu atau salah ketik)" };
  }
  const expiresAt = parseYYYYMMDD(dateStr);
  if (!expiresAt) {
    return { valid: false, reason: "Format tanggal pada kunci tidak valid" };
  }
  if (expiresAt.getTime() < Date.now()) {
    return { valid: false, reason: "Kunci sudah kedaluwarsa" };
  }
  return { valid: true, expiresAt };
}
