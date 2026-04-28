"use server";

// src/app/(dashboard)/admin/classes/actions.ts

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const classSchema = z.object({
  name: z.string().min(1, "Nama kelas wajib diisi"),
  grade: z.string().optional(),
  teacherId: z.string().optional(),
});

type ActionResult = {
  success: boolean;
  error?: string;
};

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function createClass(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();

    const raw = {
      name: formData.get("name") as string,
      grade: (formData.get("grade") as string) || undefined,
      teacherId: (formData.get("teacherId") as string) || undefined,
    };

    const parsed = classSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    await prisma.class.create({
      data: {
        name: parsed.data.name,
        grade: parsed.data.grade ?? null,
        teacherId: parsed.data.teacherId || null,
      },
    });

    revalidatePath("/admin/classes");
    return { success: true };
  } catch {
    return { success: false, error: "Gagal menambahkan kelas" };
  }
}

export async function updateClass(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();

    const id = formData.get("id") as string;
    const raw = {
      name: formData.get("name") as string,
      grade: (formData.get("grade") as string) || undefined,
      teacherId: (formData.get("teacherId") as string) || undefined,
    };

    const parsed = classSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    await prisma.class.update({
      where: { id },
      data: {
        name: parsed.data.name,
        grade: parsed.data.grade ?? null,
        teacherId: parsed.data.teacherId || null,
      },
    });

    revalidatePath("/admin/classes");
    return { success: true };
  } catch {
    return { success: false, error: "Gagal mengubah kelas" };
  }
}

export async function toggleClassActive(classId: string): Promise<ActionResult> {
  try {
    await requireAdmin();

    const cls = await prisma.class.findUnique({ where: { id: classId } });
    if (!cls) {
      return { success: false, error: "Kelas tidak ditemukan" };
    }

    await prisma.class.update({
      where: { id: classId },
      data: { isActive: !cls.isActive },
    });

    revalidatePath("/admin/classes");
    return { success: true };
  } catch {
    return { success: false, error: "Gagal mengubah status kelas" };
  }
}

export async function deleteClass(classId: string): Promise<ActionResult> {
  try {
    await requireAdmin();

    const cls = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        _count: { select: { students: true, sessions: true } },
      },
    });

    if (!cls) {
      return { success: false, error: "Kelas tidak ditemukan" };
    }

    if (cls._count.students > 0) {
      return {
        success: false,
        error: `Kelas masih memiliki ${cls._count.students} siswa. Pindahkan siswa terlebih dahulu.`,
      };
    }

    if (cls._count.sessions > 0) {
      return {
        success: false,
        error: `Kelas memiliki ${cls._count.sessions} sesi absensi. Nonaktifkan saja.`,
      };
    }

    await prisma.class.delete({ where: { id: classId } });

    revalidatePath("/admin/classes");
    return { success: true };
  } catch {
    return { success: false, error: "Gagal menghapus kelas" };
  }
}
