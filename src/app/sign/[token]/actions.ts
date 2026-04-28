"use server";

// src/app/sign/[token]/actions.ts

import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

type ActionResult = {
  success: boolean;
  error?: string;
};

/**
 * Submit a signature for a recipient identified by their unique token.
 * Public route — no auth required.
 */
export async function submitSignature(
  token: string,
  signatureDataUrl: string
): Promise<ActionResult> {
  try {
    if (!signatureDataUrl || !signatureDataUrl.startsWith("data:image/")) {
      return { success: false, error: "Tanda tangan tidak valid" };
    }

    // Find recipient by token
    const recipient = await prisma.recipient.findUnique({
      where: { token },
      include: {
        document: { select: { id: true, status: true, title: true } },
      },
    });

    if (!recipient) {
      return { success: false, error: "Token tidak ditemukan atau tidak berlaku" };
    }

    if (recipient.status === "SIGNED") {
      return { success: false, error: "Dokumen sudah ditandatangani sebelumnya" };
    }

    if (recipient.status === "DECLINED") {
      return { success: false, error: "Anda telah menolak menandatangani dokumen ini" };
    }

    if (recipient.tokenExpiresAt && recipient.tokenExpiresAt < new Date()) {
      return { success: false, error: "Tautan tanda tangan telah kedaluwarsa" };
    }

    if (
      recipient.document.status !== "SENT" &&
      recipient.document.status !== "IN_PROGRESS"
    ) {
      return { success: false, error: "Dokumen tidak tersedia untuk ditandatangani" };
    }

    // Get IP & UA
    const hdrs = await headers();
    const ipAddress =
      hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      hdrs.get("x-real-ip") ||
      "unknown";
    const userAgent = hdrs.get("user-agent") ?? "unknown";

    // Transaction: create signature, update recipient, update doc status
    await prisma.$transaction(async (tx) => {
      await tx.signature.create({
        data: {
          documentId: recipient.documentId,
          recipientId: recipient.id,
          signatureUrl: signatureDataUrl,
          ipAddress,
          userAgent,
        },
      });

      await tx.recipient.update({
        where: { id: recipient.id },
        data: { status: "SIGNED", signedAt: new Date() },
      });

      // Update document status: IN_PROGRESS while some pending, COMPLETED when all signed
      const remaining = await tx.recipient.count({
        where: {
          documentId: recipient.documentId,
          status: { notIn: ["SIGNED", "DECLINED"] },
        },
      });

      const allSigned = remaining === 0;
      const anyDeclined = await tx.recipient.count({
        where: { documentId: recipient.documentId, status: "DECLINED" },
      });

      const newStatus = allSigned
        ? anyDeclined > 0
          ? "IN_PROGRESS"
          : "COMPLETED"
        : "IN_PROGRESS";

      await tx.document.update({
        where: { id: recipient.documentId },
        data: { status: newStatus },
      });
    });

    revalidatePath(`/sign/${token}`);
    return { success: true };
  } catch (err) {
    console.error("[sign] submitSignature error:", err);
    return { success: false, error: "Gagal menyimpan tanda tangan" };
  }
}

/**
 * Decline to sign a document.
 */
export async function declineSignature(token: string, reason?: string): Promise<ActionResult> {
  try {
    const recipient = await prisma.recipient.findUnique({
      where: { token },
    });

    if (!recipient) {
      return { success: false, error: "Token tidak ditemukan" };
    }

    if (recipient.status === "SIGNED") {
      return { success: false, error: "Sudah ditandatangani, tidak dapat ditolak" };
    }

    if (recipient.status === "DECLINED") {
      return { success: false, error: "Sudah ditolak sebelumnya" };
    }

    await prisma.recipient.update({
      where: { id: recipient.id },
      data: { status: "DECLINED", signedAt: new Date() },
    });

    void reason; // reason can be used in future schema enhancement

    revalidatePath(`/sign/${token}`);
    return { success: true };
  } catch (err) {
    console.error("[sign] declineSignature error:", err);
    return { success: false, error: "Gagal mencatat penolakan" };
  }
}

/**
 * Mark recipient as having opened the document (for tracking).
 */
export async function markOpened(token: string): Promise<void> {
  try {
    const recipient = await prisma.recipient.findUnique({
      where: { token },
      select: { id: true, status: true },
    });
    if (recipient && recipient.status === "PENDING") {
      await prisma.recipient.update({
        where: { id: recipient.id },
        data: { status: "OPENED" },
      });
    }
  } catch {
    // Silent fail — non-critical tracking
  }
}
