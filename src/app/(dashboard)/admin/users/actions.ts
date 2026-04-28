"use server";

// src/app/(dashboard)/admin/users/actions.ts

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createUserSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: z.enum(["ADMIN", "TEACHER"]),
  phone: z.string().optional(),
});

const updateUserSchema = z.object({
  id: z.string(),
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Format email tidak valid"),
  role: z.enum(["ADMIN", "TEACHER"]),
  phone: z.string().optional(),
  password: z.string().min(6, "Password minimal 6 karakter").optional().or(z.literal("")),
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

export async function createUser(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();

    const raw = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      role: formData.get("role") as string,
      phone: (formData.get("phone") as string) || undefined,
    };

    const parsed = createUserSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });
    if (existing) {
      return { success: false, error: "Email sudah terdaftar" };
    }

    const hashedPassword = await bcrypt.hash(parsed.data.password, 12);

    await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: hashedPassword,
        role: parsed.data.role,
        phone: parsed.data.phone ?? null,
      },
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch {
    return { success: false, error: "Gagal menambahkan pengguna" };
  }
}

export async function updateUser(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();

    const raw = {
      id: formData.get("id") as string,
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      role: formData.get("role") as string,
      phone: (formData.get("phone") as string) || undefined,
      password: (formData.get("password") as string) || undefined,
    };

    const parsed = updateUserSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });
    if (existing && existing.id !== parsed.data.id) {
      return { success: false, error: "Email sudah digunakan pengguna lain" };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      phone: parsed.data.phone ?? null,
    };

    if (parsed.data.password && parsed.data.password.length >= 6) {
      updateData.password = await bcrypt.hash(parsed.data.password, 12);
    }

    await prisma.user.update({
      where: { id: parsed.data.id },
      data: updateData,
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch {
    return { success: false, error: "Gagal mengubah pengguna" };
  }
}

export async function toggleUserActive(userId: string): Promise<ActionResult> {
  try {
    const currentUser = await requireAdmin();

    if (currentUser.id === userId) {
      return { success: false, error: "Tidak dapat menonaktifkan diri sendiri" };
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { success: false, error: "Pengguna tidak ditemukan" };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch {
    return { success: false, error: "Gagal mengubah status pengguna" };
  }
}

export async function deleteUser(userId: string): Promise<ActionResult> {
  try {
    const currentUser = await requireAdmin();

    if (currentUser.id === userId) {
      return { success: false, error: "Tidak dapat menghapus diri sendiri" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: { sessions: true, classes: true },
        },
      },
    });

    if (!user) {
      return { success: false, error: "Pengguna tidak ditemukan" };
    }

    if (user._count.sessions > 0 || user._count.classes > 0) {
      return {
        success: false,
        error: "Pengguna masih memiliki kelas atau sesi absensi. Nonaktifkan saja.",
      };
    }

    await prisma.user.delete({ where: { id: userId } });

    revalidatePath("/admin/users");
    return { success: true };
  } catch {
    return { success: false, error: "Gagal menghapus pengguna" };
  }
}
