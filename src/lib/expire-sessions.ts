// src/lib/expire-sessions.ts
//
// Lazily flips ACTIVE attendance sessions whose QR has expired
// to status=EXPIRED. Cheap idempotent updateMany — safe to call
// before any list/read operation that surfaces session.status.

import { prisma } from "@/lib/db/prisma";

export async function expireStaleSessions(): Promise<number> {
  const now = new Date();
  try {
    const result = await prisma.attendanceSession.updateMany({
      where: {
        status: "ACTIVE",
        qrExpiresAt: { lt: now },
      },
      data: { status: "EXPIRED" },
    });
    return result.count;
  } catch {
    // Don't break the page if maintenance update fails.
    return 0;
  }
}
