// src/app/(dashboard)/admin/reports/page.tsx

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { expireStaleSessions } from "@/lib/expire-sessions";
import { getReportData } from "./actions";
import { ReportsClient } from "./reports-client";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/unauthorized");

  await expireStaleSessions();

  const [initialData, classesRaw] = await Promise.all([
    getReportData({}),
    prisma.class.findMany({
      where: { isActive: true },
      orderBy: [{ grade: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  const classes = classesRaw.map((c) => ({ id: c.id, name: c.name }));

  return <ReportsClient initialData={initialData} classes={classes} />;
}
