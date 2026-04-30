// src/lib/rate-limit.ts
//
// Lightweight in-memory rate limiter. Suitable for single-region deployments
// (Vercel serverless will reset per cold start, which is fine for short windows).
// For multi-region durability, replace with Upstash Redis / Vercel KV.

type Bucket = {
  count: number;
  resetAt: number;
};

const STORE = new Map<string, Bucket>();
const MAX_KEYS = 10_000;

/**
 * Check whether `key` has exceeded `limit` requests in `windowMs` milliseconds.
 *
 * Returns:
 *  - allowed: boolean
 *  - remaining: number of requests left in the current window
 *  - resetAt: epoch ms when the window resets
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const existing = STORE.get(key);

  if (!existing || existing.resetAt <= now) {
    // New window
    if (STORE.size >= MAX_KEYS) {
      // Crude eviction: drop expired entries first
      for (const [k, v] of STORE) {
        if (v.resetAt <= now) STORE.delete(k);
        if (STORE.size < MAX_KEYS) break;
      }
      // If still full, drop oldest 10% naively
      if (STORE.size >= MAX_KEYS) {
        const toDrop = Math.floor(MAX_KEYS * 0.1);
        let i = 0;
        for (const k of STORE.keys()) {
          STORE.delete(k);
          if (++i >= toDrop) break;
        }
      }
    }
    const resetAt = now + windowMs;
    STORE.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count++;
  return { allowed: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

/**
 * Convenience: extract a stable client IP from incoming Headers.
 * Trusts standard proxy headers (Vercel sets x-forwarded-for).
 */
export function getClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    // First entry is the original client
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    headers.get("x-real-ip") ??
    headers.get("cf-connecting-ip") ??
    "unknown"
  );
}
