import nodemailer from "nodemailer";
import { env } from "../config/env.js";

export function isEmailVerificationEnabled(): boolean {
  return Boolean(env.EMAIL_HOST && env.EMAIL_USER && env.EMAIL_PASS && env.EMAIL_FROM);
}

function requireMailConfig() {
  const host = env.EMAIL_HOST;
  const port = env.EMAIL_PORT ?? 587;
  const secure = env.EMAIL_SECURE === "true";
  const user = env.EMAIL_USER;
  const pass = env.EMAIL_PASS;
  const from = env.EMAIL_FROM;
  if (!host || !user || !pass || !from) {
    throw new Error("Email is not fully configured. Set EMAIL_HOST, EMAIL_USER, EMAIL_PASS, EMAIL_FROM.");
  }
  return { host, port, secure, user, pass, from };
}

export async function sendVerificationEmail(params: { to: string; token: string }) {
  const cfg = requireMailConfig();
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });

  const verifyUrl = `${env.BACKEND_URL.replace(/\/$/, "")}/api/auth/verify-email?token=${encodeURIComponent(params.token)}`;

  await transporter.sendMail({
    from: cfg.from,
    to: params.to,
    subject: "Verify your BadgeNest account",
    text: `Welcome to BadgeNest!\n\nPlease verify your email by opening this link:\n${verifyUrl}\n\nThis link expires in 24 hours.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <h2>Verify your BadgeNest account</h2>
        <p>Welcome! Please verify your email by clicking the button below:</p>
        <p>
          <a href="${verifyUrl}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px">
            Verify Email
          </a>
        </p>
        <p>If the button does not work, open this link:</p>
        <p><a href="${verifyUrl}">${verifyUrl}</a></p>
        <p>This link expires in 24 hours.</p>
      </div>
    `,
  });
}
