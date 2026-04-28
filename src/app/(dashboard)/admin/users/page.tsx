// src/app/(dashboard)/admin/users/page.tsx

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { UsersClient } from "./users-client";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/unauthorized");

  const usersRaw = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: { classes: true, sessions: true },
      },
    },
  });

  const users = usersRaw.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    phone: u.phone,
    isActive: u.isActive,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
    classCount: u._count.classes,
    sessionCount: u._count.sessions,
  }));

  return <UsersClient users={users} />;
}
