// scripts/gen-license.ts
//
// CLI: generate a TandaHadir license key.
//
// Usage:
//   npx ts-node scripts/gen-license.ts --days 365
//   npx ts-node scripts/gen-license.ts --until 2027-12-31
//   npx ts-node scripts/gen-license.ts --days 30 --count 5
//
// Requires LICENSE_SECRET (or AUTH_SECRET as fallback) in .env

import "dotenv/config";
import { createHmac } from "node:crypto";

// Inlined to avoid ts-node ESM resolver issues with relative .ts imports.
// Must stay in sync with src/lib/license/key.ts.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const RAND_LEN = 8;
const SIG_LEN = 10;

function getSecret(): string {
  const s = process.env.LICENSE_SECRET || process.env.AUTH_SECRET || "";
  if (!s) throw new Error("LICENSE_SECRET or AUTH_SECRET must be set");
  return s;
}
function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex").slice(0, SIG_LEN);
}
function randomBlock(): string {
  let s = "";
  for (let i = 0; i < RAND_LEN; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}
function dateToYYYYMMDD(d: Date): string {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
}
function generateLicenseKey(expiresAt: Date): string {
  const payload = `TH-${randomBlock()}-${dateToYYYYMMDD(expiresAt)}`;
  return `${payload}-${sign(payload)}`;
}

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
      out[key] = val;
    }
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const count = Math.max(1, parseInt(args.count ?? "1", 10));

  let expiresAt: Date;
  if (args.until) {
    expiresAt = new Date(args.until);
    if (isNaN(expiresAt.getTime())) {
      console.error("❌ Format --until salah. Pakai YYYY-MM-DD");
      process.exit(1);
    }
  } else {
    const days = parseInt(args.days ?? "365", 10);
    if (!Number.isFinite(days) || days <= 0) {
      console.error("❌ --days harus angka positif");
      process.exit(1);
    }
    expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  const secret = process.env.LICENSE_SECRET || process.env.AUTH_SECRET || "";
  if (!secret) {
    console.error("❌ LICENSE_SECRET atau AUTH_SECRET harus di-set di .env");
    process.exit(1);
  }
  if (!process.env.LICENSE_SECRET) {
    console.warn("⚠️  Menggunakan AUTH_SECRET sebagai fallback. Untuk produksi, set LICENSE_SECRET terpisah.");
  }

  const expiryStr = expiresAt.toISOString().split("T")[0];
  console.log(`\n🔑 Generating ${count} license key${count > 1 ? "s" : ""}`);
  console.log(`   Berlaku hingga : ${expiryStr}\n`);

  for (let i = 0; i < count; i++) {
    const key = generateLicenseKey(expiresAt);
    console.log(`   ${key}`);
  }
  console.log("");
}

main();
