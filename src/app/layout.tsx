// src/app/layout.tsx

import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "TandaHadir — Absensi Digital untuk Sekolah",
  description: "Platform absensi QR code dan e-tanda tangan untuk sekolah Indonesia.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${geist.variable} font-sans antialiased`}>
        <SessionProvider>
          {children}
        </SessionProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}