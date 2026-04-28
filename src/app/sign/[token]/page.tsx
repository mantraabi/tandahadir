// src/app/sign/[token]/page.tsx

import { prisma } from "@/lib/db/prisma";
import { SignClient } from "./sign-client";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function SignPage({ params }: PageProps) {
  const { token } = await params;

  const recipient = await prisma.recipient.findUnique({
    where: { token },
    include: {
      document: {
        include: {
          creator: { select: { name: true } },
        },
      },
    },
  });

  if (!recipient) {
    return <ErrorState title="Tautan Tidak Valid" message="Token tanda tangan tidak ditemukan atau telah dihapus." />;
  }

  if (recipient.tokenExpiresAt && recipient.tokenExpiresAt < new Date()) {
    return <ErrorState title="Tautan Kedaluwarsa" message="Tautan tanda tangan ini telah kedaluwarsa. Silakan hubungi pembuat dokumen." />;
  }

  if (
    recipient.document.status === "DRAFT" ||
    recipient.document.status === "CANCELLED"
  ) {
    return <ErrorState title="Dokumen Tidak Tersedia" message="Dokumen ini belum dikirim atau telah dibatalkan." />;
  }

  // Get school name
  const school = await prisma.school.findFirst();

  return (
    <SignClient
      token={token}
      recipient={{
        id: recipient.id,
        name: recipient.name,
        role: recipient.role,
        status: recipient.status,
        signedAt: recipient.signedAt?.toISOString() ?? null,
      }}
      document={{
        id: recipient.document.id,
        title: recipient.document.title,
        description: recipient.document.description,
        fileUrl: recipient.document.fileUrl,
        creatorName: recipient.document.creator.name,
        schoolName: school?.name ?? "TandaHadir",
        createdAt: recipient.document.createdAt.toISOString(),
      }}
    />
  );
}

function ErrorState({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen bg-[#f8f6f1] flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 rounded-3xl bg-amber-50 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={36} className="text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
          <p className="text-sm text-gray-500 mb-6">{message}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0d5c63] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a50] transition-colors"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </main>
    </div>
  );
}
