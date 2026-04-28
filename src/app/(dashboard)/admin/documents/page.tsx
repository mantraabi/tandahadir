// src/app/(dashboard)/admin/documents/page.tsx

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { DocumentsClient } from "./documents-client";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/unauthorized");

  const documentsRaw = await prisma.document.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      creator: { select: { id: true, name: true } },
      recipients: {
        orderBy: { orderIndex: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          signedAt: true,
        },
      },
      signatures: {
        orderBy: { signedAt: "desc" },
        select: {
          id: true,
          userId: true,
          user: { select: { name: true } },
          signedAt: true,
        },
      },
    },
  });

  const documents = documentsRaw.map((d) => ({
    id: d.id,
    title: d.title,
    description: d.description,
    fileUrl: d.fileUrl,
    signedUrl: d.signedUrl,
    status: d.status,
    createdById: d.createdById,
    creatorName: d.creator.name,
    recipients: d.recipients.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      role: r.role,
      status: r.status,
      signedAt: r.signedAt?.toISOString() ?? null,
    })),
    signatures: d.signatures.map((s) => ({
      id: s.id,
      userId: s.userId,
      userName: s.user?.name ?? null,
      signedAt: s.signedAt.toISOString(),
    })),
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }));

  return <DocumentsClient documents={documents} />;
}
