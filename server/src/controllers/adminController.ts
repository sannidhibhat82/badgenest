import type { Request, Response } from "express";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { ok, forbidden, notFound, noContent, badRequest } from "../lib/http.js";
import { parseJson } from "../lib/validate.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { env } from "../config/env.js";
import { adminAssertionRow, apiKeyRow, auditLogRow, userLearnerRow, webhookRow } from "../lib/serialize.js";

const PromoteBody = z.object({ email: z.string().email() }).strict();

async function anyAdminExists(): Promise<boolean> {
  const row = await prisma.userRole.findFirst({ where: { role: "admin" } });
  return Boolean(row);
}

export async function postPromote(req: Request, res: Response) {
  const body = parseJson(PromoteBody, req.body ?? {}, res);
  if (!body) return;

  const emailNorm = body.email.trim().toLowerCase();
  const hasAdmin = await anyAdminExists();

  if (hasAdmin) {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
  } else {
    const expected = env.ADMIN_BOOTSTRAP_SECRET;
    if (!expected) {
      return forbidden(
        res,
        "No admin exists yet. Set ADMIN_BOOTSTRAP_SECRET in env to bootstrap the first admin."
      );
    }
    const provided = String(req.headers["x-bootstrap-secret"] ?? "");
    if (provided !== expected) {
      return forbidden(res, "Invalid bootstrap secret");
    }
  }

  const user = await prisma.user.findUnique({
    where: { email: emailNorm },
    select: { id: true, email: true },
  });
  if (!user) return notFound(res, "User not found");

  const existing = await prisma.userRole.findFirst({
    where: { userId: user.id, role: "admin" },
  });
  if (!existing) {
    await prisma.userRole.create({
      data: { id: uuidv4(), userId: user.id, role: "admin" },
    });
  }

  return ok(res, { message: "User promoted to admin", user: { id: user.id, email: user.email } });
}

export async function getDashboardStats(req: Request, res: Response) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const [badgesRes, activeRes, revokedRes, learnersRes, recent] = await Promise.all([
    prisma.badgeClass.count(),
    prisma.assertion.count({ where: { revoked: false } }),
    prisma.assertion.count({ where: { revoked: true } }),
    prisma.user.count(),
    prisma.assertion.findMany({
      take: 10,
      orderBy: { issuedAt: "desc" },
      include: {
        recipient: { select: { fullName: true } },
        badgeClass: { select: { name: true } },
      },
    }),
  ]);

  return ok(res, {
    total_badges: badgesRes,
    active_assertions: activeRes,
    revoked_assertions: revokedRes,
    total_learners: learnersRes,
    chart_data: [],
    recent: recent.map((a) => ({
      id: a.id,
      issued_at: a.issuedAt,
      revoked: a.revoked,
      learner_name: a.recipient?.fullName ?? "Unknown",
      badge_name: a.badgeClass?.name ?? "Unknown",
    })),
  });
}

export async function getAdminAssertions(req: Request, res: Response) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const rows = await prisma.assertion.findMany({
    orderBy: { issuedAt: "desc" },
    include: {
      badgeClass: { select: { name: true, expiryDays: true } },
      recipient: { select: { fullName: true, email: true } },
    },
  });
  return ok(res, rows.map(adminAssertionRow));
}

export async function getLearners(req: Request, res: Response) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const rows = await prisma.user.findMany({
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, email: true, avatarUrl: true, createdAt: true },
  });
  return ok(res, rows.map(userLearnerRow));
}

export async function getAuditLogs(req: Request, res: Response) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const rows = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { fullName: true } } },
  });
  return ok(res, rows.map((r) => auditLogRow({ ...r, actor: r.actor })));
}

export async function postAuditLog(req: Request, res: Response) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const { action, entity_type, entity_id, details } = (req.body ?? {}) as Record<string, unknown>;
  if (!action || !entity_type) {
    return badRequest(res, "action and entity_type required");
  }

  const id = uuidv4();
  await prisma.auditLog.create({
    data: {
      id,
      actorId: auth.userId,
      action: String(action),
      entityType: String(entity_type),
      entityId: entity_id ? String(entity_id) : null,
      details: details ? JSON.stringify(details) : null,
    },
  });
  return ok(res, { id }, 201);
}

export async function listWebhooks(req: Request, res: Response) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const rows = await prisma.webhook.findMany({
    where: { createdBy: admin.userId },
    orderBy: { createdAt: "desc" },
  });
  return ok(res, rows.map(webhookRow));
}

export async function postWebhook(req: Request, res: Response) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const { url, events, secret } = (req.body ?? {}) as {
    url?: string;
    events?: unknown;
    secret?: string;
  };
  if (!url) return badRequest(res, "url required");

  const id = uuidv4();
  const eventsStr = Array.isArray(events) ? JSON.stringify(events) : JSON.stringify(events ?? []);

  await prisma.webhook.create({
    data: {
      id,
      url,
      events: eventsStr,
      secret: secret ?? "",
      createdBy: admin.userId,
    },
  });
  return ok(res, { id }, 201);
}

export async function patchWebhook(req: Request, res: Response) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const { active } = (req.body ?? {}) as { active?: boolean };
  await prisma.webhook.updateMany({
    where: { id: req.params.id, createdBy: admin.userId },
    data: { active: Boolean(active) },
  });
  return ok(res, { message: "Updated" });
}

export async function deleteWebhook(req: Request, res: Response) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  await prisma.webhook.deleteMany({
    where: { id: req.params.id, createdBy: admin.userId },
  });
  return noContent(res);
}

export async function listApiKeys(req: Request, res: Response) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const rows = await prisma.apiKey.findMany({
    where: { createdBy: admin.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      keyPrefix: true,
      name: true,
      createdAt: true,
      expiresAt: true,
      lastUsedAt: true,
      revoked: true,
    },
  });
  return ok(res, rows.map(apiKeyRow));
}

export async function postApiKey(req: Request, res: Response) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const { name } = (req.body ?? {}) as { name?: string };
  if (!name) return badRequest(res, "name required");

  const rawKey = `bn_${crypto.randomBytes(24).toString("hex")}`;
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.slice(0, 12);
  const id = uuidv4();

  await prisma.apiKey.create({
    data: {
      id,
      keyHash,
      keyPrefix,
      name,
      createdBy: admin.userId,
    },
  });

  return ok(res, { id, key: rawKey, key_prefix: keyPrefix }, 201);
}

export async function revokeApiKey(req: Request, res: Response) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  await prisma.apiKey.updateMany({
    where: { id: req.params.id, createdBy: admin.userId },
    data: { revoked: true },
  });
  return ok(res, { message: "Revoked" });
}
