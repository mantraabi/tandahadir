"use client";

// src/components/layout/navbar.tsx

import { Bell, Menu } from "lucide-react";
import { useSession } from "next-auth/react";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin Sekolah",
  TEACHER: "Guru",
};

type NavbarProps = {
  onMenuClick: () => void;
};

export function Navbar({ onMenuClick }: NavbarProps) {
  const { data: session } = useSession();
  const user = session?.user;

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 shrink-0">
      {/* Hamburger mobile */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
      >
        <Menu size={20} />
      </button>

      <div className="flex-1" />

      {/* Right */}
      <div className="flex items-center gap-2">
        <button className="relative p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button>

        <div className="flex items-center gap-2.5 pl-2">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-gray-800 leading-none">
              {user?.name ?? "..."}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {ROLE_LABEL[user?.role ?? ""] ?? ""}
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#0d5c63] flex items-center justify-center text-white text-xs font-bold shrink-0">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}