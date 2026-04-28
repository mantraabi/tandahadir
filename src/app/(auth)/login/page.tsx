"use client";

// src/app/(auth)/login/page.tsx

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, LogIn, Loader2 } from "lucide-react";
import Link from "next/link";

const loginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

type LoginForm = z.infer<typeof loginSchema>;

const ROLE_REDIRECT: Record<string, string> = {
  ADMIN: "/admin",
  TEACHER: "/teacher",
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 animate-pulse">
          <div className="h-8 w-48 bg-gray-100 rounded mb-2" />
          <div className="h-4 w-64 bg-gray-100 rounded mb-8" />
          <div className="space-y-5">
            <div className="h-10 bg-gray-100 rounded-lg" />
            <div className="h-10 bg-gray-100 rounded-lg" />
            <div className="h-10 bg-gray-100 rounded-lg" />
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") ?? "";

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginForm) {
    setServerError("");

    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    if (result?.error) {
      setServerError("Email atau password salah.");
      return;
    }

    // Ambil session untuk tahu role
    const { getSession } = await import("next-auth/react");
    const session = await getSession();
    const role = session?.user?.role ?? "";

    const redirectTo = nextUrl || ROLE_REDIRECT[role] || "/";
    router.replace(redirectTo);
    router.refresh();
  }

  return (
    <div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Selamat datang kembali
          </h1>
          <p className="text-gray-500 text-sm">
            Masuk ke dashboard sekolah kamu
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              placeholder="nama@sekolah.sch.id"
              className={`w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-all
                ${errors.email
                  ? "border-red-400 bg-red-50"
                  : "border-gray-200 bg-gray-50 focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20"
                }`}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-[#0d5c63] hover:underline"
              >
                Lupa password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                className={`w-full px-4 py-2.5 pr-11 rounded-lg border text-sm outline-none transition-all
                  ${errors.password
                    ? "border-red-400 bg-red-50"
                    : "border-gray-200 bg-gray-50 focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20"
                  }`}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
            )}
          </div>

          {/* Server error */}
          {serverError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#0d5c63] text-white py-2.5 rounded-lg font-medium text-sm
              hover:bg-[#0a4a50] transition-colors disabled:opacity-60
              flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <><Loader2 size={16} className="animate-spin" /> Memproses...</>
            ) : (
              <><LogIn size={16} /> Masuk</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}