"use server";

// src/app/(dashboard)/admin/settings/actions.ts

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";

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

// ─── School Profile ───

const schoolSchema = z.object({
  name: z.string().min(2, "Nama sekolah minimal 2 karakter"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Format email tidak valid").optional().or(z.literal("")),
  principal: z.string().optional(),
  npsn: z.string().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  defaultRadius: z.number().int().min(10).max(2000).nullable().optional(),
});

export async function updateSchoolProfile(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();

    const latStr = formData.get("latitude") as string | null;
    const lngStr = formData.get("longitude") as string | null;
    const radiusStr = formData.get("defaultRadius") as string | null;

    const raw = {
      name: formData.get("name") as string,
      address: (formData.get("address") as string) || undefined,
      phone: (formData.get("phone") as string) || undefined,
      email: (formData.get("email") as string) || "",
      principal: (formData.get("principal") as string) || undefined,
      npsn: (formData.get("npsn") as string) || undefined,
      latitude: latStr && latStr !== "" ? parseFloat(latStr) : null,
      longitude: lngStr && lngStr !== "" ? parseFloat(lngStr) : null,
      defaultRadius: radiusStr ? parseInt(radiusStr) : null,
    };

    const parsed = schoolSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const data = {
      name: parsed.data.name,
      address: parsed.data.address ?? null,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email || null,
      principal: parsed.data.principal ?? null,
      npsn: parsed.data.npsn ?? null,
      latitude: parsed.data.latitude ?? null,
      longitude: parsed.data.longitude ?? null,
      defaultRadius: parsed.data.defaultRadius ?? null,
    };

    const school = await prisma.school.findFirst();
    if (school) {
      await prisma.school.update({ where: { id: school.id }, data });
    } else {
      await prisma.school.create({ data });
    }

    revalidatePath("/admin/settings");
    return { success: true };
  } catch {
    return { success: false, error: "Gagal menyimpan profil sekolah" };
  }
}

// ─── Change Admin Password ───

const passwordSchema = z.object({
  currentPassword: z.string().min(6, "Password minimal 6 karakter"),
  newPassword: z.string().min(6, "Password baru minimal 6 karakter"),
  confirmPassword: z.string().min(6, "Konfirmasi password minimal 6 karakter"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Password baru tidak sama",
  path: ["confirmPassword"],
});

export async function changePassword(formData: FormData): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();

    const raw = {
      currentPassword: formData.get("currentPassword") as string,
      newPassword: formData.get("newPassword") as string,
      confirmPassword: formData.get("confirmPassword") as string,
    };

    const parsed = passwordSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const user = await prisma.user.findUnique({ where: { id: admin.id } });
    if (!user) {
      return { success: false, error: "User tidak ditemukan" };
    }

    const match = await bcrypt.compare(parsed.data.currentPassword, user.password);
    if (!match) {
      return { success: false, error: "Password saat ini salah" };
    }

    const hashed = await bcrypt.hash(parsed.data.newPassword, 12);
    await prisma.user.update({
      where: { id: admin.id },
      data: { password: hashed },
    });

    return { success: true };
  } catch {
    return { success: false, error: "Gagal mengubah password" };
  }
}

// ─── Update Admin Profile ───

const profileSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Format email tidak valid"),
  phone: z.string().optional(),
});

export async function updateAdminProfile(formData: FormData): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();

    const raw = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: (formData.get("phone") as string) || undefined,
    };

    const parsed = profileSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    // Check email uniqueness
    if (parsed.data.email !== admin.email) {
      const existing = await prisma.user.findUnique({
        where: { email: parsed.data.email },
      });
      if (existing) {
        return { success: false, error: "Email sudah digunakan" };
      }
    }

    await prisma.user.update({
      where: { id: admin.id },
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone ?? null,
      },
    });

    revalidatePath("/admin/settings");
    return { success: true };
  } catch {
    return { success: false, error: "Gagal menyimpan profil admin" };
  }
}

// ─── License Activation ───

export async function activateLicense(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
    const { validateLicenseKey } = await import("@/lib/license/key");

    const rawKey = ((formData.get("key") as string) ?? "").trim();
    if (!rawKey) {
      return { success: false, error: "Kunci lisensi tidak boleh kosong" };
    }

    const result = validateLicenseKey(rawKey);
    if (!result.valid) {
      return { success: false, error: result.reason };
    }

    // Pull current school name to keep license metadata consistent
    const school = await prisma.school.findFirst({ select: { name: true } });
    const schoolName = school?.name ?? "TandaHadir";

    const existing = await prisma.license.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      await prisma.license.update({
        where: { id: existing.id },
        data: {
          key: rawKey.toUpperCase(),
          schoolName,
          status: "ACTIVE",
          licenseEndsAt: result.expiresAt,
          activatedAt: new Date(),
        },
      });
    } else {
      // Trial fallback: ensure trialEndsAt is non-null per schema
      await prisma.license.create({
        data: {
          key: rawKey.toUpperCase(),
          schoolName,
          status: "ACTIVE",
          trialEndsAt: result.expiresAt,
          licenseEndsAt: result.expiresAt,
          activatedAt: new Date(),
        },
      });
    }

    revalidatePath("/admin/settings");
    revalidatePath("/admin");
    revalidatePath("/teacher");
    revalidatePath("/teacher/attendance");
    return { success: true };
  } catch (e) {
    console.error("[activateLicense]", e);
    return { success: false, error: "Gagal mengaktivasi lisensi" };
  }
}
