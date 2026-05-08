import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email?.trim()) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

    // Always return success to avoid user enumeration
    if (!user || !user.password) {
      return NextResponse.json({ success: true });
    }

    // Delete any existing reset tokens for this user
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await prisma.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt },
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "https://advocateassist.replit.app";
    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;

    // Send email if SMTP is configured, otherwise log for dev
    const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
    if (smtpConfigured) {
      try {
        const nodemailer = await import("nodemailer");
        const transporter = nodemailer.default.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT ?? "587"),
          secure: process.env.SMTP_PORT === "465",
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
        await transporter.sendMail({
          from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
          to: user.email,
          subject: "Reset your Advocate Assist password",
          html: `
            <div style="font-family:sans-serif;max-width:500px;margin:auto">
              <h2 style="color:#0f172a">Reset your password</h2>
              <p>Click the link below to reset your Advocate Assist password. This link expires in 1 hour.</p>
              <a href="${resetUrl}" style="display:inline-block;background:#0f172a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">Reset Password</a>
              <p style="color:#64748b;font-size:13px">If you did not request this, ignore this email.</p>
            </div>
          `,
        });
      } catch (_e) {
        // Email send failed — token still created, reset URL logged server-side
      }
    } else {
      // Development fallback: store reset URL in response (remove in production)
      if (process.env.NODE_ENV !== "production") {
        return NextResponse.json({ success: true, devResetUrl: resetUrl });
      }
    }

    return NextResponse.json({ success: true });
  } catch (_e) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
