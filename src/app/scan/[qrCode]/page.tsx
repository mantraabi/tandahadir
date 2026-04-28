// src/app/scan/[qrCode]/page.tsx

import { prisma } from "@/lib/db/prisma";
import { ScanClient } from "./scan-client";
import { AlertTriangle, XCircle } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ qrCode: string }>;
};

export default async function ScanPage({ params }: PageProps) {
  const { qrCode } = await params;

  const session = await prisma.attendanceSession.findUnique({
    where: { qrCode },
    include: {
      class: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
    },
  });

  if (!session) {
    return (
      <ErrorState
        icon="warning"
        title="QR Code Tidak Valid"
        message="QR code yang Anda scan tidak ditemukan dalam sistem."
      />
    );
  }

  if (session.status === "CANCELLED") {
    return (
      <ErrorState
        icon="cancel"
        title="Sesi Dibatalkan"
        message="Sesi absensi ini telah dibatalkan oleh guru."
      />
    );
  }

  if (session.status === "CLOSED") {
    return (
      <ErrorState
        icon="cancel"
        title="Sesi Telah Ditutup"
        message="Sesi absensi ini sudah ditutup. Silakan hubungi guru Anda."
      />
    );
  }

  if (session.status === "EXPIRED" || session.qrExpiresAt < new Date()) {
    return (
      <ErrorState
        icon="cancel"
        title="QR Code Kedaluwarsa"
        message="Sesi absensi ini telah berakhir. Silakan minta guru untuk membuka sesi baru."
      />
    );
  }

  // School name
  const school = await prisma.school.findFirst();

  return (
    <ScanClient
      qrCode={qrCode}
      session={{
        id: session.id,
        className: session.class.name,
        subject: session.subject,
        teacherName: session.createdBy.name,
        schoolName: school?.name ?? "TandaHadir",
        qrExpiresAt: session.qrExpiresAt.toISOString(),
        requiresGeo:
          session.latitude != null &&
          session.longitude != null &&
          session.radius != null,
      }}
    />
  );
}

function ErrorState({
  icon,
  title,
  message,
}: {
  icon: "warning" | "cancel";
  title: string;
  message: string;
}) {
  return (
    <div className="min-h-screen bg-[#f8f6f1] flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div
            className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 ${
              icon === "warning" ? "bg-amber-50" : "bg-red-50"
            }`}
          >
            {icon === "warning" ? (
              <AlertTriangle size={36} className="text-amber-500" />
            ) : (
              <XCircle size={36} className="text-red-500" />
            )}
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
