"use server";

// src/app/(dashboard)/admin/documents/actions.ts

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

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

// ─── Create Document ───

const createDocSchema = z.object({
  title: z.string().min(2, "Judul minimal 2 karakter"),
  description: z.string().optional(),
  fileUrl: z.string().min(1, "File harus diupload"),
});

export async function createDocument(formData: FormData): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();

    const raw = {
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || undefined,
      fileUrl: formData.get("fileUrl") as string,
    };

    const parsed = createDocSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    await prisma.document.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        fileUrl: parsed.data.fileUrl,
        createdById: admin.id as string,
        status: "DRAFT",
      },
    });

    revalidatePath("/admin/documents");
    return { success: true };
  } catch {
    return { success: false, error: "Gagal membuat dokumen" };
  }
}

// ─── Update Document ───

const updateDocSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(2, "Judul minimal 2 karakter"),
  description: z.string().optional(),
  status: z.enum(["DRAFT", "SENT", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
});

export async function updateDocument(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();

    const raw = {
      id: formData.get("id") as string,
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || undefined,
      status: formData.get("status") as string,
    };

    const parsed = updateDocSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    await prisma.document.update({
      where: { id: parsed.data.id },
      data: {
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        status: parsed.data.status,
      },
    });

    revalidatePath("/admin/documents");
    return { success: true };
  } catch {
    return { success: false, error: "Gagal mengupdate dokumen" };
  }
}

// ─── Delete Document ───

export async function deleteDocument(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();

    await prisma.document.delete({ where: { id } });

    revalidatePath("/admin/documents");
    return { success: true };
  } catch {
    return { success: false, error: "Gagal menghapus dokumen" };
  }
}

// ─── Add Recipient ───

const recipientSchema = z.object({
  documentId: z.string().min(1),
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Format email tidak valid").optional().or(z.literal("")),
  phone: z.string().optional(),
  role: z.enum(["ORANG_TUA", "GURU", "MURID", "WALI_KELAS", "KEPALA_SEKOLAH"]),
});

export async function addRecipient(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();

    const raw = {
      documentId: formData.get("documentId") as string,
      name: formData.get("name") as string,
      email: (formData.get("email") as string) || "",
      phone: (formData.get("phone") as string) || undefined,
      role: formData.get("role") as string,
    };

    const parsed = recipientSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const maxOrder = await prisma.recipient.aggregate({
      where: { documentId: parsed.data.documentId },
      _max: { orderIndex: true },
    });

    await prisma.recipient.create({
      data: {
        documentId: parsed.data.documentId,
        name: parsed.data.name,
        email: parsed.data.email || null,
        phone: parsed.data.phone ?? null,
        role: parsed.data.role,
        orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
      },
    });

    revalidatePath("/admin/documents");
    return { success: true };
  } catch {
    return { success: false, error: "Gagal menambah penerima" };
  }
}

// ─── Remove Recipient ───

export async function removeRecipient(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();

    await prisma.recipient.delete({ where: { id } });

    revalidatePath("/admin/documents");
    return { success: true };
  } catch {
    return { success: false, error: "Gagal menghapus penerima" };
  }
}

// ─── Send Document (change status to SENT) ───

export async function sendDocument(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();

    const doc = await prisma.document.findUnique({
      where: { id },
      include: { recipients: true },
    });

    if (!doc) return { success: false, error: "Dokumen tidak ditemukan" };
    if (doc.recipients.length === 0) {
      return { success: false, error: "Tambahkan penerima terlebih dahulu" };
    }

    await prisma.document.update({
      where: { id },
      data: { status: "SENT" },
    });

    revalidatePath("/admin/documents");
    return { success: true };
  } catch {
    return { success: false, error: "Gagal mengirim dokumen" };
  }
}
