"use server";

// src/app/(dashboard)/teacher/documents/actions.ts

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";

type ActionResult = {
  success: boolean;
  error?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
};

async function requireTeacher() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

// Verify teacher owns the document (created by them)
async function ensureOwner(documentId: string, teacherId: string) {
  const doc = await prisma.document.findFirst({
    where: { id: documentId, createdById: teacherId },
  });
  return doc;
}

// ─── Schemas ───

const documentSchema = z.object({
  title: z.string().trim().min(3, "Judul minimal 3 karakter").max(200),
  description: z.string().trim().max(1000).optional().nullable(),
  fileUrl: z.string().trim().url("URL file tidak valid"),
});

const updateDocumentSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(1000).optional().nullable(),
  status: z.enum(["DRAFT", "SENT", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
});

const recipientSchema = z.object({
  documentId: z.string(),
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
  email: z.string().trim().email("Email tidak valid").optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  role: z.enum(["ORANG_TUA", "GURU", "MURID", "WALI_KELAS", "KEPALA_SEKOLAH"]),
});

// ─── Create Document ───

export async function createDocument(formData: FormData): Promise<ActionResult> {
  try {
    const teacher = await requireTeacher();

    const parsed = documentSchema.safeParse({
      title: formData.get("title"),
      description: formData.get("description") || null,
      fileUrl: formData.get("fileUrl"),
    });

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
    }

    const doc = await prisma.document.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        fileUrl: parsed.data.fileUrl,
        createdById: teacher.id as string,
        status: "DRAFT",
      },
    });

    revalidatePath("/teacher/documents");
    return { success: true, data: { id: doc.id } };
  } catch {
    return { success: false, error: "Gagal membuat dokumen" };
  }
}

// ─── Update Document ───

export async function updateDocument(documentId: string, formData: FormData): Promise<ActionResult> {
  try {
    const teacher = await requireTeacher();

    const doc = await ensureOwner(documentId, teacher.id as string);
    if (!doc) return { success: false, error: "Dokumen tidak ditemukan" };

    const parsed = updateDocumentSchema.safeParse({
      title: formData.get("title"),
      description: formData.get("description") || null,
      status: formData.get("status"),
    });

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
    }

    await prisma.document.update({
      where: { id: documentId },
      data: parsed.data,
    });

    revalidatePath("/teacher/documents");
    return { success: true };
  } catch {
    return { success: false, error: "Gagal mengubah dokumen" };
  }
}

// ─── Delete Document ───

export async function deleteDocument(documentId: string): Promise<ActionResult> {
  try {
    const teacher = await requireTeacher();

    const doc = await ensureOwner(documentId, teacher.id as string);
    if (!doc) return { success: false, error: "Dokumen tidak ditemukan" };

    await prisma.document.delete({ where: { id: documentId } });

    revalidatePath("/teacher/documents");
    return { success: true };
  } catch {
    return { success: false, error: "Gagal menghapus dokumen" };
  }
}

// ─── Add Recipient ───

export async function addRecipient(formData: FormData): Promise<ActionResult> {
  try {
    const teacher = await requireTeacher();

    const parsed = recipientSchema.safeParse({
      documentId: formData.get("documentId"),
      name: formData.get("name"),
      email: formData.get("email") || "",
      phone: formData.get("phone") || "",
      role: formData.get("role"),
    });

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
    }

    const doc = await ensureOwner(parsed.data.documentId, teacher.id as string);
    if (!doc) return { success: false, error: "Dokumen tidak ditemukan" };

    const lastIndex = await prisma.recipient.count({
      where: { documentId: parsed.data.documentId },
    });

    await prisma.recipient.create({
      data: {
        documentId: parsed.data.documentId,
        name: parsed.data.name,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        role: parsed.data.role,
        status: "PENDING",
        orderIndex: lastIndex,
      },
    });

    revalidatePath("/teacher/documents");
    return { success: true };
  } catch {
    return { success: false, error: "Gagal menambah penerima" };
  }
}

// ─── Remove Recipient ───

export async function removeRecipient(recipientId: string): Promise<ActionResult> {
  try {
    const teacher = await requireTeacher();

    const recipient = await prisma.recipient.findUnique({
      where: { id: recipientId },
      include: { document: { select: { createdById: true } } },
    });

    if (!recipient) return { success: false, error: "Penerima tidak ditemukan" };
    if (recipient.document.createdById !== teacher.id) {
      return { success: false, error: "Tidak diizinkan" };
    }

    await prisma.recipient.delete({ where: { id: recipientId } });

    revalidatePath("/teacher/documents");
    return { success: true };
  } catch {
    return { success: false, error: "Gagal menghapus penerima" };
  }
}

// ─── Send Document ───

export async function sendDocument(documentId: string): Promise<ActionResult> {
  try {
    const teacher = await requireTeacher();

    const doc = await prisma.document.findFirst({
      where: { id: documentId, createdById: teacher.id as string },
      include: { recipients: true },
    });

    if (!doc) return { success: false, error: "Dokumen tidak ditemukan" };
    if (doc.status !== "DRAFT") return { success: false, error: "Dokumen sudah dikirim" };
    if (doc.recipients.length === 0) {
      return { success: false, error: "Tambahkan minimal 1 penerima" };
    }

    await prisma.document.update({
      where: { id: documentId },
      data: { status: "SENT" },
    });

    revalidatePath("/teacher/documents");
    return { success: true };
  } catch {
    return { success: false, error: "Gagal mengirim dokumen" };
  }
}
