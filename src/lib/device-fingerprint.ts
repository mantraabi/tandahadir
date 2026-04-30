// src/lib/device-fingerprint.ts
import { createHash } from "crypto";

/**
 * Build a stable, opaque device hash from IP + user agent.
 * NOT cryptographically secure identification — only used as a soft heuristic
 * to detect the same browser/device submitting attendance for multiple students.
 */
export function deviceFingerprint(ip: string, userAgent: string | null): string {
  const ua = userAgent ?? "";
  return createHash("sha256").update(`${ip}|${ua}`).digest("hex").slice(0, 32);
}
