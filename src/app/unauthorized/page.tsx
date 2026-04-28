// src/app/unauthorized/page.tsx

import Link from "next/link";
import { ShieldOff, Home, LogOut } from "lucide-react";
import { auth, signOut } from "@/lib/auth";

const ROLE_HOME: Record<string, string> = {
  ADMIN: "/admin",
  TEACHER: "/teacher",
};

export default async function UnauthorizedPage() {
  const session = await auth();
  const role = session?.user?.role ?? "";
  const homeUrl = ROLE_HOME[role] ?? "/";

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="min-h-screen bg-[#f8f6f1] flex flex-col">
      {/* Header */}
      <header className="px-6 py-5">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#0d5c63] rounded-lg flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M9 1.5L2 5.5V12.5L9 16.5L16 12.5V5.5L9 1.5Z"
                stroke="white"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path d="M9 8.5L6.5 7L6.5 10.5L9 12L11.5 10.5V7L9 8.5Z" fill="white" />
            </svg>
          </div>
          <span className="font-bold text-[#0d5c63] text-lg tracking-tight">TandaHadir</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 rounded-3xl bg-red-50 flex items-center justify-center mx-auto mb-6">
            <ShieldOff size={36} className="text-red-500" />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Akses Ditolak</h1>
          <p className="text-sm text-gray-500 mb-1">
            Anda tidak memiliki izin untuk membuka halaman ini.
          </p>
          {session?.user && (
            <p className="text-xs text-gray-400 mb-8">
              Login sebagai <span className="font-medium text-gray-600">{session.user.name}</span>
              {role && (
                <>
                  {" "}· <span className="font-medium text-gray-600">{role}</span>
                </>
              )}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <Link
              href={homeUrl}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0d5c63] text-white rounded-xl text-sm font-semibold hover:bg-[#0a4a50] transition-colors"
            >
              <Home size={16} />
              Kembali ke Beranda
            </Link>
            {session?.user && (
              <form action={handleSignOut}>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors w-full"
                >
                  <LogOut size={16} />
                  Keluar
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <footer className="px-6 py-4 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} TandaHadir
      </footer>
    </div>
  );
}
