"use client";

// src/components/layout/sidebar.tsx

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard, QrCode, FileSignature, Users,
  BookOpen, GraduationCap, BarChart3, Settings,
  LogOut, ChevronLeft, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
};

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  ADMIN: [
    { label: "Dashboard",   href: "/admin",           icon: LayoutDashboard },
    { label: "Pengguna",    href: "/admin/users",      icon: Users           },
    { label: "Kelas",       href: "/admin/classes",    icon: BookOpen        },
    { label: "Siswa",       href: "/admin/students",   icon: GraduationCap   },
    { label: "Laporan",     href: "/admin/reports",    icon: BarChart3       },
    { label: "Audit Log",   href: "/admin/audit",      icon: Shield          },
    { label: "Dokumen",     href: "/admin/documents",  icon: FileSignature   },
    { label: "Pengaturan",  href: "/admin/settings",   icon: Settings        },
  ],
  TEACHER: [
    { label: "Dashboard",   href: "/teacher",                    icon: LayoutDashboard },
    { label: "Absensi",     href: "/teacher/attendance",         icon: QrCode          },
    { label: "Dokumen",     href: "/teacher/documents",          icon: FileSignature   },
  ],
};

type SidebarProps = {
  collapsed: boolean;
  onCollapse: (val: boolean) => void;
};

export function Sidebar({ collapsed, onCollapse }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [loggingOut, setLoggingOut] = useState(false);

  const role = session?.user?.role ?? "TEACHER";
  const navItems = NAV_BY_ROLE[role] ?? NAV_BY_ROLE.TEACHER;

  async function handleLogout() {
    setLoggingOut(true);
    await signOut({ redirect: false });
    router.replace("/login");
  }

  return (
    <aside
      className={cn(
        "relative h-screen bg-[#0d5c63] flex flex-col transition-all duration-300 shrink-0",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-5 border-b border-white/10",
        collapsed && "justify-center px-0"
      )}>
        <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center shrink-0">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 1.5L2 5.5V12.5L9 16.5L16 12.5V5.5L9 1.5Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M9 8.5L6.5 7L6.5 10.5L9 12L11.5 10.5V7L9 8.5Z" fill="white"/>
          </svg>
        </div>
        {!collapsed && (
          <span className="font-bold text-white text-base tracking-tight">
            TandaHadir
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === "/admin" || item.href === "/teacher"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                collapsed && "justify-center px-0 w-10 mx-auto",
                isActive
                  ? "bg-white/15 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              )}
            >
              <item.icon size={18} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
      <div className="border-t border-white/10 p-3 space-y-1">
        {!collapsed && session?.user && (
          <div className="px-3 py-2">
            <p className="text-xs text-white/40 truncate">{session.user.email}</p>
            <p className="text-xs font-medium text-white/70 truncate">{session.user.name}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          title={collapsed ? "Keluar" : undefined}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-white/60 hover:text-white hover:bg-white/10",
            collapsed && "justify-center px-0 w-10 mx-auto"
          )}
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span>{loggingOut ? "Keluar..." : "Keluar"}</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => onCollapse(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow"
      >
        <ChevronLeft
          size={14}
          className={cn(
            "text-gray-500 transition-transform duration-300",
            collapsed && "rotate-180"
          )}
        />
      </button>
    </aside>
  );
}