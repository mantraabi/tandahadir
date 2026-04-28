// src/app/(dashboard)/admin/classes/page.tsx

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { ClassesClient } from "./classes-client";

export const dynamic = "force-dynamic";

export default async function ClassesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/unauthorized");

  const [classesRaw, teachersRaw] = await Promise.all([
    prisma.class.findMany({
      orderBy: [{ grade: "asc" }, { name: "asc" }],
      include: {
        teacher: { select: { id: true, name: true } },
        _count: { select: { students: true, sessions: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: "TEACHER", isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const classes = classesRaw.map((c) => ({
    id: c.id,
    name: c.name,
    grade: c.grade,
    teacherId: c.teacherId,
    teacherName: c.teacher?.name ?? null,
    isActive: c.isActive,
    studentCount: c._count.students,
    sessionCount: c._count.sessions,
    createdAt: c.createdAt.toISOString(),
  }));

  const teachers = teachersRaw.map((t) => ({
    id: t.id,
    name: t.name,
  }));

  return <ClassesClient classes={classes} teachers={teachers} />;
}
