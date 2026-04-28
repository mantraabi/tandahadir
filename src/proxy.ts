// src/proxy.ts

import { auth } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/", "/pricing", "/login", "/forgot-password"];
const AUTH_ONLY_ROUTES = ["/login", "/forgot-password"];

const ROLE_HOME: Record<string, string> = {
  ADMIN: "/admin",
  TEACHER: "/teacher",
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Selalu loloskan — asset, auth API, scan, sign
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/scan/") ||
    pathname.startsWith("/sign/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/images")
  ) {
    return NextResponse.next();
  }

  // Proteksi cron
  if (pathname.startsWith("/api/cron/")) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  const session = await auth();
  const isLoggedIn = !!session?.user;
  const role = session?.user?.role ?? "";

  const isPublic = PUBLIC_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(r + "/")
  );

  // Belum login → redirect ke login
  if (!isLoggedIn && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Sudah login & akses halaman auth → redirect ke dashboard
  if (isLoggedIn && AUTH_ONLY_ROUTES.includes(pathname)) {
    const home = ROLE_HOME[role] ?? "/";
    return NextResponse.redirect(new URL(home, request.url));
  }

  // Proteksi route per role
  if (isLoggedIn) {
    if (pathname.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
    if (
      pathname.startsWith("/teacher") &&
      role !== "TEACHER" &&
      role !== "ADMIN"
    ) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/).*)"],
};