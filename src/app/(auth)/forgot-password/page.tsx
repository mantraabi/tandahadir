"use client";

// src/app/(auth)/forgot-password/page.tsx

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { requestPasswordReset } from "./actions";

const schema = z.object({
  email: z.string().email("Format email tidak valid"),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [success, setSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormValues) {
    await requestPasswordReset(values.email);
    setSubmittedEmail(values.email);
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 size={28} className="text-teal-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Cek Email Anda</h1>
        <p className="text-sm text-gray-500 mb-1">
          Jika email <span className="font-semibold text-gray-700">{submittedEmail}</span> terdaftar,
        </p>
        <p className="text-sm text-gray-500 mb-6">
          kami akan mengirim instruksi reset password.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#0d5c63] hover:underline"
        >
          <ArrowLeft size={14} />
          Kembali ke Login
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Lupa Password?</h1>
      <p className="text-sm text-gray-500 mb-8">
        Masukkan email akun Anda. Kami akan kirim instruksi reset password.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              {...register("email")}
              type="email"
              placeholder="email@sekolah.com"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#0d5c63] focus:bg-white focus:ring-2 focus:ring-[#0d5c63]/20 transition-all"
            />
          </div>
          {errors.email && (
            <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 rounded-lg bg-[#0d5c63] text-white text-sm font-semibold hover:bg-[#0a4a50] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isSubmitting && <Loader2 size={14} className="animate-spin" />}
          Kirim Instruksi
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#0d5c63] transition-colors"
        >
          <ArrowLeft size={14} />
          Kembali ke Login
        </Link>
      </div>
    </div>
  );
}
