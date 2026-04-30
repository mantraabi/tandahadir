// src/app/(dashboard)/admin/audit/page.tsx

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getAuditLogs } from "./actions";
import { AuditClient } from "./audit-client";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/unauthorized");

  const [initial, classesRaw] = await Promise.all([
    getAuditLogs({ page: 1, perPage: 25 }),
    prisma.class.findMany({
      where: { isActive: true },
      orderBy: [{ grade: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  return (
    <AuditClient
      initialResult={initial}
      classes={classesRaw.map((c) => ({ id: c.id, name: c.name }))}
    />
  );
}
