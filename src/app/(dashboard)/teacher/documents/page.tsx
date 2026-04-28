// src/app/(dashboard)/teacher/documents/page.tsx

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { DocumentsClient, type DocumentItem } from "./documents-client";

export const dynamic = "force-dynamic";

export default async function TeacherDocumentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
    redirect("/unauthorized");
  }

  const teacherId = session.user.id as string;
  const teacherEmail = session.user.email ?? null;

  // Fetch user record to get email reliably
  const me = await prisma.user.findUnique({
    where: { id: teacherId },
    select: { email: true },
  });
  const myEmail = me?.email ?? teacherEmail;

  const include = {
    creator: { select: { id: true, name: true } },
    recipients: {
      orderBy: { orderIndex: "asc" as const },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        signedAt: true,
        token: true,
      },
    },
  };

  const [myDocsRaw, forMeDocsRaw] = await Promise.all([
    prisma.document.findMany({
      where: { createdById: teacherId },
      orderBy: { createdAt: "desc" },
      include,
    }),
    myEmail
      ? prisma.document.findMany({
          where: {
            createdById: { not: teacherId },
            recipients: {
              some: { email: { equals: myEmail, mode: "insensitive" } },
            },
          },
          orderBy: { createdAt: "desc" },
          include,
        })
      : Promise.resolve([]),
  ]);

  function serialize(d: typeof myDocsRaw[number]): DocumentItem {
    return {
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
        token: r.token,
      })),
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    };
  }

  const myDocuments = myDocsRaw.map(serialize);
  const forMeDocuments = forMeDocsRaw.map(serialize);

  return (
    <DocumentsClient
      myDocuments={myDocuments}
      forMeDocuments={forMeDocuments}
      myEmail={myEmail}
    />
  );
}
