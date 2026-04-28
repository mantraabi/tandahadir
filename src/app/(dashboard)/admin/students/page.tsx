// src/app/(dashboard)/admin/students/page.tsx

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { StudentsClient } from "./students-client";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ classId?: string }>;
};

export default async function StudentsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/unauthorized");

  const params = await searchParams;

  const [studentsRaw, classesRaw] = await Promise.all([
    prisma.student.findMany({
      orderBy: [{ class: { name: "asc" } }, { name: "asc" }],
      include: {
        class: { select: { id: true, name: true } },
        _count: { select: { attendances: true } },
      },
    }),
    prisma.class.findMany({
      where: { isActive: true },
      orderBy: [{ grade: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  const students = studentsRaw.map((s) => ({
    id: s.id,
    name: s.name,
    nisn: s.nisn,
    nis: s.nis,
    gender: s.gender,
    birthDate: s.birthDate?.toISOString() ?? null,
    address: s.address,
    parentName: s.parentName,
    parentPhone: s.parentPhone,
    classId: s.classId,
    className: s.class.name,
    status: s.status,
    attendanceCount: s._count.attendances,
    createdAt: s.createdAt.toISOString(),
  }));

  const classes = classesRaw.map((c) => ({
    id: c.id,
    name: c.name,
  }));

  return (
    <StudentsClient
      students={students}
      classes={classes}
      initialClassId={params.classId}
    />
  );
}
