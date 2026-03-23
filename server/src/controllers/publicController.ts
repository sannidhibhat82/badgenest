import type { Request, Response } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { ok, notFound, badRequest, unauthorized } from "../lib/http.js";
import { parseJson } from "../lib/validate.js";
import { requireAdmin, getBearerPayload } from "../middleware/auth.js";
import { env } from "../config/env.js";

const ViewBody = z.object({ assertion_id: z.string().uuid() }).strict();
const ClaimBody = z.object({ invite_id: z.string().uuid() }).strict();

const UploadBody = z
  .object({
    data: z.string().min(1),
    filename: z.string().optional(),
  })
  .strict();

const BUCKETS = ["avatars", "badge-images", "issuer-logos"] as const;
const ALLOWED_EXT = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function pickExt(filename?: string): string {
  const ext = filename ? path.extname(filename).toLowerCase() : ".png";
  return ALLOWED_EXT.has(ext) ? ext : ".png";
}

export async function getVerifyAssertion(req: Request, res: Response) {
  const assertionId = req.params.assertionId?.trim();
  if (!assertionId) return badRequest(res, "Invalid assertionId");

  const row = await prisma.assertion.findFirst({
    where: { id: assertionId },
    include: {
      badgeClass: true,
      recipient: { select: { fullName: true, avatarUrl: true } },
    },
  });
  if (!row) return notFound(res, "Assertion not found");

  const issuer = row.badgeClass.issuerId
    ? await prisma.issuer.findUnique({ where: { id: row.badgeClass.issuerId } })
    : null;

  const viewCount = await prisma.badgeView.count({ where: { assertionId } });

  return ok(res, {
    assertion: {
      id: row.id,
      badge_class_id: row.badgeClassId,
      recipient_id: row.recipientId,
      issued_at: row.issuedAt,
      expires_at: row.expiresAt,
      revoked: row.revoked,
      revocation_reason: row.revocationReason,
      evidence_url: row.evidenceUrl,
      signature: row.signature,
    },
    badge_class: {
      id: row.badgeClass.id,
      name: row.badgeClass.name,
      description: row.badgeClass.description,
      image_url: row.badgeClass.imageUrl,
      criteria: row.badgeClass.criteria,
      issuer_id: row.badgeClass.issuerId,
    },
    issuer: issuer
      ? { id: issuer.id, name: issuer.name, logo_url: issuer.logoUrl }
      : { id: row.badgeClass.issuerId, name: null, logo_url: null },
    recipient: {
      full_name: row.recipient?.fullName ?? null,
      avatar_url: row.recipient?.avatarUrl ?? null,
    },
    view_count: viewCount,
  });
}

export async function postRecordView(req: Request, res: Response) {
  const body = parseJson(ViewBody, req.body ?? {}, res);
  if (!body) return;

  const exists = await prisma.assertion.findUnique({
    where: { id: body.assertion_id },
    select: { id: true },
  });
  if (!exists) return notFound(res, "Assertion not found");

  const id = uuidv4();
  await prisma.badgeView.create({
    data: { id, assertionId: body.assertion_id },
  });
  return ok(res, { id }, 201);
}

export async function getInviteByToken(req: Request, res: Response) {
  const token = req.params.token?.trim();
  if (!token) return badRequest(res, "Invalid token");

  const row = await prisma.badgeInvite.findFirst({
    where: { inviteToken: token },
    include: { badgeClass: { include: { issuer: true } } },
  });
  if (!row) return notFound(res, "Invite not found");

  const maskedEmail = row.email ? String(row.email).replace(/(.).*@/, "$1***@") : "";

  return ok(res, {
    id: row.id,
    badge_class_id: row.badgeClassId,
    status: row.status,
    masked_email: maskedEmail,
    evidence_url: row.evidenceUrl,
    badge_classes: {
      name: row.badgeClass.name,
      description: row.badgeClass.description,
      image_url: row.badgeClass.imageUrl,
    },
    issuer: row.badgeClass.issuer
      ? { name: row.badgeClass.issuer.name, logo_url: row.badgeClass.issuer.logoUrl }
      : { name: null, logo_url: null },
  });
}

export async function postClaimInvite(req: Request, res: Response) {
  const payload = getBearerPayload(req);
  if (!payload) return unauthorized(res);

  const body = parseJson(ClaimBody, req.body ?? {}, res);
  if (!body) return;

  const invite = await prisma.badgeInvite.findUnique({
    where: { id: body.invite_id },
  });
  if (!invite) return notFound(res, "Invite not found");
  if (invite.status === "claimed") return badRequest(res, "Invite already claimed");

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { email: true },
  });
  if (!user || user.email?.toLowerCase() !== invite.email?.toLowerCase()) {
    return res.status(403).json({ error: "This invite was sent to a different email address" });
  }

  const assertionId = uuidv4();
  await prisma.$transaction([
    prisma.assertion.create({
      data: {
        id: assertionId,
        badgeClassId: invite.badgeClassId,
        recipientId: payload.sub,
        evidenceUrl: invite.evidenceUrl,
      },
    }),
    prisma.badgeInvite.update({
      where: { id: invite.id },
      data: { status: "claimed", claimedBy: payload.sub, claimedAt: new Date() },
    }),
  ]);

  return ok(res, { id: assertionId, message: "Badge claimed" });
}

export async function getPublicProfile(req: Request, res: Response) {
  const userId = req.params.userId?.trim();
  if (!userId) return badRequest(res, "Invalid userId");

  const profile = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, fullName: true, avatarUrl: true, createdAt: true },
  });
  if (!profile) return notFound(res, "Profile not found");

  const assertionsData = await prisma.assertion.findMany({
    where: { recipientId: userId, revoked: false },
    orderBy: { issuedAt: "desc" },
    include: {
      badgeClass: { include: { issuer: true } },
    },
  });

  const allViews = await prisma.badgeView.findMany({ select: { assertionId: true } });
  const viewMap: Record<string, number> = {};
  for (const v of allViews) {
    viewMap[v.assertionId] = (viewMap[v.assertionId] || 0) + 1;
  }

  const assertions = assertionsData.map((a) => ({
    id: a.id,
    badge_class_id: a.badgeClassId,
    issued_at: a.issuedAt,
    expires_at: a.expiresAt,
    revoked: a.revoked,
    evidence_url: a.evidenceUrl,
    badge: {
      id: a.badgeClass.id,
      name: a.badgeClass.name,
      description: a.badgeClass.description,
      image_url: a.badgeClass.imageUrl,
      issuer_id: a.badgeClass.issuerId,
      issuer: a.badgeClass.issuer
        ? { name: a.badgeClass.issuer.name, logo_url: a.badgeClass.issuer.logoUrl }
        : { name: null, logo_url: null },
    },
    views: viewMap[a.id] ?? 0,
  }));

  const totalViews = Object.values(viewMap).reduce((s, v) => s + v, 0);

  return ok(res, {
    profile: {
      user_id: profile.id,
      full_name: profile.fullName,
      avatar_url: profile.avatarUrl,
      created_at: profile.createdAt,
    },
    assertions,
    totalViews,
  });
}

export async function postUpload(req: Request, res: Response) {
  const payload = getBearerPayload(req);
  if (!payload) return unauthorized(res);

  const bucket = typeof req.query.bucket === "string" ? req.query.bucket : "";
  if (!BUCKETS.includes(bucket as (typeof BUCKETS)[number])) {
    return badRequest(res, "Invalid bucket");
  }

  if (bucket !== "avatars") {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
  }

  const body = parseJson(UploadBody, req.body ?? {}, res);
  if (!body) return;

  const buf = Buffer.from(body.data, "base64");
  if (!buf.length) return badRequest(res, "Invalid base64 data");
  if (buf.length > MAX_UPLOAD_BYTES) {
    return badRequest(res, `File too large (max ${MAX_UPLOAD_BYTES} bytes)`);
  }

  const ext = pickExt(body.filename);
  const prefix = bucket === "avatars" ? payload.sub : "img";
  const rand = crypto.randomBytes(8).toString("hex");
  const safeName = `${prefix}-${Date.now()}-${rand}${ext}`;

  const dir = path.join(env.uploadDirAbs, bucket);
  ensureDir(dir);
  const filepath = path.join(dir, safeName);
  fs.writeFileSync(filepath, buf, { flag: "wx" });

  const url = `/uploads/${bucket}/${safeName}`;
  return ok(res, { path: url, publicUrl: url });
}
