import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import {
  ok,
  unauthorized,
  conflict,
  badRequest,
  serviceUnavailable,
} from "../lib/http.js";
import { parseJson } from "../lib/validate.js";
import { signToken } from "../lib/jwt.js";
import { getBearerPayload } from "../middleware/auth.js";
import { isEmailVerificationEnabled, sendVerificationEmail } from "../services/email.service.js";
import { requireAuth } from "../middleware/auth.js";
import { logger } from "../config/logger.js";

const SignupBody = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().trim().min(1).max(500).optional(),
});

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const PasswordBody = z.object({ password: z.string().min(6) });

const EmailBody = z.object({ email: z.string().email() }).strict();

export async function postSignup(req: Request, res: Response) {
  const body = parseJson(SignupBody, req.body ?? {}, res);
  if (!body) return;

  const emailNorm = body.email.trim().toLowerCase();
  const id = uuidv4();
  const hash = await bcrypt.hash(body.password, 10);
  const smtpOn = isEmailVerificationEnabled();

  try {
    await prisma.user.create({
      data: {
        id,
        email: emailNorm,
        passwordHash: hash,
        emailVerified: !smtpOn,
        fullName: body.full_name ?? null,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return conflict(res, "An account with this email already exists");
    }
    throw e;
  }

  await prisma.userRole.create({
    data: { id: uuidv4(), userId: id, role: "learner" },
  });

  if (!smtpOn) {
    const token = signToken(id, emailNorm);
    return ok(
      res,
      {
        message: "Account created. You can sign in (email verification is disabled without SMTP).",
        token,
        user: {
          id,
          email: emailNorm,
          full_name: body.full_name ?? null,
          avatar_url: null,
          email_verified: true,
        },
      },
      201
    );
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.emailVerification.create({
    data: {
      id: uuidv4(),
      userId: id,
      tokenHash,
      expiresAt,
    },
  });

  try {
    await sendVerificationEmail({ to: emailNorm, token: rawToken });
    return ok(
      res,
      {
        message: "Account created. Verification email sent.",
        user: {
          id,
          email: emailNorm,
          full_name: body.full_name ?? null,
          avatar_url: null,
          email_verified: false,
        },
      },
      201
    );
  } catch (err) {
    logger.error("signup email send failed", err);
    return ok(
      res,
      {
        message:
          "Account created, but verification email could not be sent right now. Configure email and use resend verification.",
        user: {
          id,
          email: emailNorm,
          full_name: body.full_name ?? null,
          avatar_url: null,
          email_verified: false,
        },
      },
      201
    );
  }
}

export async function postLogin(req: Request, res: Response) {
  const body = parseJson(LoginBody, req.body ?? {}, res);
  if (!body) return;

  const emailNorm = body.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: emailNorm } });
  if (!user) return unauthorized(res, "Invalid email or password");

  const valid = await bcrypt.compare(body.password, user.passwordHash);
  if (!valid) return unauthorized(res, "Invalid email or password");
  if (isEmailVerificationEnabled() && !user.emailVerified) {
    return res.status(403).json({ error: "Email not verified. Please verify your account first." });
  }

  const token = signToken(user.id, user.email);
  return ok(res, {
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.fullName,
      avatar_url: user.avatarUrl,
    },
  });
}

export async function getSession(req: Request, res: Response) {
  const payload = getBearerPayload(req);
  if (!payload) {
    return ok(res, { user: null, profile: null, roles: [] });
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    return ok(res, { user: null, profile: null, roles: [] });
  }

  const rolesRows = await prisma.userRole.findMany({
    where: { userId: user.id },
    select: { role: true },
  });
  const roles = rolesRows.map((r) => r.role);

  return ok(res, {
    user: { id: user.id, email: user.email },
    profile: { full_name: user.fullName, avatar_url: user.avatarUrl },
    roles,
  });
}

export async function patchUpdatePassword(req: Request, res: Response) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const body = parseJson(PasswordBody, req.body ?? {}, res);
  if (!body) return;

  const hash = await bcrypt.hash(body.password, 10);
  await prisma.user.update({
    where: { id: auth.userId },
    data: { passwordHash: hash },
  });
  return ok(res, { message: "Password updated" });
}

export async function getVerifyEmail(req: Request, res: Response) {
  const token = typeof req.query.token === "string" ? req.query.token.trim() : "";
  if (!token) return badRequest(res, "Invalid token");

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const row = await prisma.emailVerification.findFirst({
    where: { tokenHash },
    orderBy: { createdAt: "desc" },
  });

  if (!row) return badRequest(res, "Invalid verification token");
  if (row.usedAt) return badRequest(res, "Verification token already used");
  if (row.expiresAt.getTime() < Date.now()) return badRequest(res, "Verification token expired");

  await prisma.$transaction([
    prisma.emailVerification.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: row.userId },
      data: { emailVerified: true },
    }),
  ]);

  return ok(res, { message: "Email verified successfully. You can now log in." });
}

export async function postResendVerification(req: Request, res: Response) {
  const body = parseJson(EmailBody, req.body ?? {}, res);
  if (!body) return;

  if (!isEmailVerificationEnabled()) {
    return ok(res, {
      message: "Email verification is not enabled on this server. You can sign in without verifying.",
    });
  }

  const emailNorm = body.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: emailNorm },
    select: { id: true, emailVerified: true },
  });

  if (!user) {
    return ok(res, { message: "If the email exists, a verification link has been sent." });
  }
  if (user.emailVerified) {
    return ok(res, { message: "Email already verified." });
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.emailVerification.create({
    data: {
      id: uuidv4(),
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  try {
    await sendVerificationEmail({ to: emailNorm, token: rawToken });
    return ok(res, { message: "Verification email sent." });
  } catch (err) {
    logger.error("resend verification email failed", err);
    return serviceUnavailable(res, "Email service unavailable. Please configure SMTP and try again.");
  }
}
