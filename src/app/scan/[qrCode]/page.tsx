// src/app/scan/[qrCode]/page.tsx

import { prisma } from "@/lib/db/prisma";
import { cookies } from "next/headers";
import { ScanClient } from "./scan-client";
import { AlertTriangle, XCircle, CheckCircle2, Clock, GraduationCap, School, User } from "lucide-react";
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

  // Check if this device already submitted attendance for this session
  const cookieStore = await cookies();
  const attendedStudentId = cookieStore.get(`th_att_${session.id}`)?.value;

  if (attendedStudentId) {
    const attendance = await prisma.attendance.findUnique({
      where: {
        sessionId_studentId: { sessionId: session.id, studentId: attendedStudentId },
      },
      include: {
        student: { select: { name: true } },
      },
    });

    if (attendance) {
      return (
        <AttendedScreen
          studentName={attendance.student.name}
          className={session.class.name}
          subject={session.subject}
          status={attendance.status}
          checkInAt={attendance.checkInAt.toISOString()}
        />
      );
    }
  }

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

function AttendedScreen({
  studentName,
  className,
  subject,
  status,
  checkInAt,
}: {
  studentName: string;
  className: string;
  subject: string | null;
  status: string;
  checkInAt: string;
}) {
  const time = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(checkInAt));

  const statusLabel =
    status === "PRESENT" ? "Hadir" : status === "LATE" ? "Terlambat" : status;

  return (
    <div className="min-h-screen bg-[#f8f6f1] flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <div className="w-20 h-20 rounded-3xl bg-teal-50 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 size={36} className="text-teal-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Anda Sudah Absen</h1>
            <p className="text-sm text-gray-500 mb-6">
              Kehadiran Anda telah tercatat di sesi ini.
            </p>
            <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2.5">
              <Field icon={<User size={12} />} label="Nama" value={studentName} />
              <Field icon={<GraduationCap size={12} />} label="Kelas" value={className} />
              {subject && <Field icon={<School size={12} />} label="Mata Pelajaran" value={subject} />}
              <Field icon={<CheckCircle2 size={12} />} label="Status" value={statusLabel} />
              <Field icon={<Clock size={12} />} label="Waktu" value={time} />
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 mt-6">
            Tidak dapat mengabsen lagi pada sesi yang sama dari perangkat ini.
          </p>
        </div>
      </main>
    </div>
  );
}

function Field({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-400 shrink-0">{icon}</span>
      <span className="text-xs text-gray-400 shrink-0">{label}:</span>
      <span className="text-sm font-medium text-gray-700 truncate">{value}</span>
    </div>
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
