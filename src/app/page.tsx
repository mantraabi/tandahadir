// src/app/page.tsx

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role;

  if (role === "ADMIN") redirect("/admin");
  if (role === "TEACHER") redirect("/teacher");

  redirect("/login");
}