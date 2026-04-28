"use server";

// src/app/(auth)/forgot-password/actions.ts

import { prisma } from "@/lib/db/prisma";

/**
 * Request password reset.
 *
 * Always returns success (does not reveal whether the email exists)
 * to prevent user enumeration attacks.
 *
 * TODO: When schema is updated with `resetToken` + `resetTokenExpiresAt`
 * fields, implement actual token generation + email sending via Resend.
 */
export async function requestPasswordReset(email: string): Promise<{ ok: true }> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, email: true, isActive: true },
    });

    if (user && user.isActive) {
      // TODO: generate token, save to DB, send email via Resend
      // Example skeleton:
      //
      // const token = crypto.randomBytes(32).toString("hex");
      // const expires = new Date(Date.now() + 60 * 60 * 1000);
      // await prisma.user.update({
      //   where: { id: user.id },
      //   data: { resetToken: token, resetTokenExpiresAt: expires },
      // });
      // await resend.emails.send({
      //   to: user.email,
      //   subject: "Reset Password TandaHadir",
      //   html: `<a href="${process.env.APP_URL}/reset-password/${token}">Reset</a>`,
      // });

      console.log(`[forgot-password] Reset requested for ${user.email}`);
    } else {
      // Constant-time-ish behavior: still log but don't act
      console.log(`[forgot-password] Reset requested for non-existent: ${email}`);
    }
  } catch (err) {
    console.error("[forgot-password] error:", err);
  }

  // Always return ok to prevent email enumeration
  return { ok: true };
}
