// src/app/(dashboard)/admin/settings/page.tsx

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/unauthorized");

  const [schoolRaw, adminRaw, licenseRaw] = await Promise.all([
    prisma.school.findFirst(),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        lastLoginAt: true,
      },
    }),
    prisma.license.findFirst({
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const school = {
    id: schoolRaw?.id ?? null,
    name: schoolRaw?.name ?? "",
    address: schoolRaw?.address ?? null,
    phone: schoolRaw?.phone ?? null,
    email: schoolRaw?.email ?? null,
    principal: schoolRaw?.principal ?? null,
    npsn: schoolRaw?.npsn ?? null,
  };

  const admin = {
    id: adminRaw?.id ?? session.user.id ?? "",
    name: adminRaw?.name ?? session.user.name ?? "",
    email: adminRaw?.email ?? session.user.email ?? "",
    phone: adminRaw?.phone ?? null,
    role: adminRaw?.role ?? "ADMIN",
    lastLoginAt: adminRaw?.lastLoginAt?.toISOString() ?? null,
  };

  const license = licenseRaw
    ? {
        key: licenseRaw.key,
        status: licenseRaw.status,
        schoolName: licenseRaw.schoolName,
        trialEndsAt: licenseRaw.trialEndsAt.toISOString(),
        licenseEndsAt: licenseRaw.licenseEndsAt?.toISOString() ?? null,
      }
    : null;

  return <SettingsClient school={school} admin={admin} license={license} />;
}
