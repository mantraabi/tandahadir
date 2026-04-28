// src/app/(auth)/layout.tsx

import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f8f6f1] flex flex-col">
      {/* Header */}
      <header className="px-6 py-5">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-[#0d5c63] rounded-lg flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M9 1.5L2 5.5V12.5L9 16.5L16 12.5V5.5L9 1.5Z"
                stroke="white"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M9 8.5L6.5 7L6.5 10.5L9 12L11.5 10.5V7L9 8.5Z"
                fill="white"
              />
            </svg>
          </div>
          <span className="font-bold text-[#0d5c63] text-lg tracking-tight">
            TandaHadir
          </span>
        </Link>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} TandaHadir
      </footer>
    </div>
  );
}