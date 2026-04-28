"use server";

// src/app/(dashboard)/admin/students/actions.ts

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createStudentSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  nisn: z.string().optional(),
  nis: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
  birthDate: z.string().optional(),
  address: z.string().optional(),
  parentName: z.string().optional(),
  parentPhone: z.string().optional(),
  classId: z.string().min(1, "Kelas wajib dipilih"),
});

const updateStudentSchema = createStudentSchema.extend({
  id: z.string(),
  status: z.enum(["ACTIVE", "INACTIVE", "GRADUATED"]),
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

export async function createStudent(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();

    const raw = {
      name: formData.get("name") as string,
      nisn: (formData.get("nisn") as string) || undefined,
      nis: (formData.get("nis") as string) || undefined,
      gender: (formData.get("gender") as string) || undefined,
      birthDate: (formData.get("birthDate") as string) || undefined,
      address: (formData.get("address") as string) || undefined,
      parentName: (formData.get("parentName") as string) || undefined,
      parentPhone: (formData.get("parentPhone") as string) || undefined,
      classId: formData.get("classId") as string,
    };

    const parsed = createStudentSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    if (parsed.data.nisn) {
      const existing = await prisma.student.findUnique({
        where: { nisn: parsed.data.nisn },
      });
      if (existing) {
        return { success: false, error: "NISN sudah terdaftar" };
      }
    }

    await prisma.student.create({
      data: {
        name: parsed.data.name,
        nisn: parsed.data.nisn ?? null,
        nis: parsed.data.nis ?? null,
        gender: parsed.data.gender as "MALE" | "FEMALE" | undefined,
        birthDate: parsed.data.birthDate ? new Date(parsed.data.birthDate) : null,
        address: parsed.data.address ?? null,
        parentName: parsed.data.parentName ?? null,
        parentPhone: parsed.data.parentPhone ?? null,
        classId: parsed.data.classId,
      },
    });

    revalidatePath("/admin/students");
    return { success: true };
  } catch {
    return { success: false, error: "Gagal menambahkan siswa" };
  }
}

export async function updateStudent(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();

    const raw = {
      id: formData.get("id") as string,
      name: formData.get("name") as string,
      nisn: (formData.get("nisn") as string) || undefined,
      nis: (formData.get("nis") as string) || undefined,
      gender: (formData.get("gender") as string) || undefined,
      birthDate: (formData.get("birthDate") as string) || undefined,
      address: (formData.get("address") as string) || undefined,
      parentName: (formData.get("parentName") as string) || undefined,
      parentPhone: (formData.get("parentPhone") as string) || undefined,
      classId: formData.get("classId") as string,
      status: formData.get("status") as string,
    };

    const parsed = updateStudentSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    if (parsed.data.nisn) {
      const existing = await prisma.student.findUnique({
        where: { nisn: parsed.data.nisn },
      });
      if (existing && existing.id !== parsed.data.id) {
        return { success: false, error: "NISN sudah digunakan siswa lain" };
      }
    }

    await prisma.student.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        nisn: parsed.data.nisn ?? null,
        nis: parsed.data.nis ?? null,
        gender: parsed.data.gender as "MALE" | "FEMALE" | undefined,
        birthDate: parsed.data.birthDate ? new Date(parsed.data.birthDate) : null,
        address: parsed.data.address ?? null,
        parentName: parsed.data.parentName ?? null,
        parentPhone: parsed.data.parentPhone ?? null,
        classId: parsed.data.classId,
        status: parsed.data.status as "ACTIVE" | "INACTIVE" | "GRADUATED",
      },
    });

    revalidatePath("/admin/students");
    return { success: true };
  } catch {
    return { success: false, error: "Gagal mengubah data siswa" };
  }
}

export type ImportRow = {
  name: string;
  nisn?: string;
  nis?: string;
  gender?: string;
  birthDate?: string;
  address?: string;
  parentName?: string;
  parentPhone?: string;
  className?: string;
};

type ImportResult = {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
};

export async function importStudents(
  rows: ImportRow[],
  defaultClassId: string
): Promise<ImportResult> {
  try {
    await requireAdmin();

    const classesMap = new Map<string, string>();
    const allClasses = await prisma.class.findMany({
      select: { id: true, name: true },
    });
    for (const c of allClasses) {
      classesMap.set(c.name.trim().toLowerCase(), c.id);
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      if (!row.name || row.name.trim().length < 2) {
        errors.push(`Baris ${rowNum}: Nama kosong atau terlalu pendek`);
        skipped++;
        continue;
      }

      let classId = defaultClassId;
      if (row.className) {
        const found = classesMap.get(row.className.trim().toLowerCase());
        if (found) {
          classId = found;
        } else {
          errors.push(`Baris ${rowNum}: Kelas "${row.className}" tidak ditemukan, menggunakan kelas default`);
        }
      }

      if (!classId) {
        errors.push(`Baris ${rowNum}: Tidak ada kelas yang dipilih`);
        skipped++;
        continue;
      }

      if (row.nisn) {
        const existing = await prisma.student.findUnique({
          where: { nisn: row.nisn.trim() },
        });
        if (existing) {
          errors.push(`Baris ${rowNum}: NISN ${row.nisn} sudah terdaftar (${existing.name}), dilewati`);
          skipped++;
          continue;
        }
      }

      let gender: "MALE" | "FEMALE" | undefined;
      if (row.gender) {
        const g = row.gender.trim().toUpperCase();
        if (g === "L" || g === "LAKI-LAKI" || g === "MALE" || g === "M") gender = "MALE";
        else if (g === "P" || g === "PEREMPUAN" || g === "FEMALE" || g === "F") gender = "FEMALE";
      }

      try {
        await prisma.student.create({
          data: {
            name: row.name.trim(),
            nisn: row.nisn?.trim() || null,
            nis: row.nis?.trim() || null,
            gender: gender ?? null,
            birthDate: row.birthDate ? new Date(row.birthDate) : null,
            address: row.address?.trim() || null,
            parentName: row.parentName?.trim() || null,
            parentPhone: row.parentPhone?.trim() || null,
            classId,
          },
        });
        imported++;
      } catch {
        errors.push(`Baris ${rowNum}: Gagal menyimpan "${row.name}"`);
        skipped++;
      }
    }

    revalidatePath("/admin/students");
    return { success: true, imported, skipped, errors: errors.slice(0, 20) };
  } catch {
    return { success: false, imported: 0, skipped: 0, errors: ["Gagal mengimpor data"] };
  }
}

export async function deleteStudent(studentId: string): Promise<ActionResult> {
  try {
    await requireAdmin();

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { _count: { select: { attendances: true } } },
    });

    if (!student) {
      return { success: false, error: "Siswa tidak ditemukan" };
    }

    if (student._count.attendances > 0) {
      return {
        success: false,
        error: `Siswa memiliki ${student._count.attendances} data kehadiran. Ubah status menjadi Nonaktif/Lulus saja.`,
      };
    }

    await prisma.student.delete({ where: { id: studentId } });

    revalidatePath("/admin/students");
    return { success: true };
  } catch {
    return { success: false, error: "Gagal menghapus siswa" };
  }
}
