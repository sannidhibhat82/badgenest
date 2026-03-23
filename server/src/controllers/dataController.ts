import type { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { ok, notFound, noContent, badRequest } from "../lib/http.js";
import { parseJson } from "../lib/validate.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { badgeClassRow, issuerRow } from "../lib/serialize.js";

const CreateIssuer = z
  .object({
    name: z.string().trim().min(1).max(500),
    description: z.string().trim().optional(),
    email: z.string().trim().email().optional(),
    website: z.string().trim().url().max(2048).optional(),
    logo_url: z.string().trim().url().max(2048).optional(),
  })
  .strict();

const CreateBadgeClass = z
  .object({
    issuer_id: z.string().uuid(),
    name: z.string().trim().min(1).max(500),
    description: z.string().trim().optional(),
    image_url: z.string().trim().url().max(2048).optional(),
    criteria: z.string().trim().optional(),
    expiry_days: z.number().int().positive().optional(),
  })
  .strict();

const PatchBadgeClass = z
  .object({
    issuer_id: z.string().uuid().optional(),
    name: z.string().trim().min(1).max(500).optional(),
    description: z.string().trim().optional().nullable(),
    image_url: z.string().trim().url().max(2048).optional().nullable(),
    criteria: z.string().trim().optional().nullable(),
    expiry_days: z.number().int().positive().optional().nullable(),
  })
  .strict();

export async function listIssuers(_req: Request, res: Response) {
  const rows = await prisma.issuer.findMany({ orderBy: { createdAt: "desc" } });
  return ok(res, rows.map(issuerRow));
}

export async function postIssuer(req: Request, res: Response) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const body = parseJson(CreateIssuer, req.body ?? {}, res);
  if (!body) return;

  const id = uuidv4();
  await prisma.issuer.create({
    data: {
      id,
      name: body.name,
      description: body.description ?? null,
      email: body.email ?? null,
      website: body.website ?? null,
      logoUrl: body.logo_url ?? null,
    },
  });
  return ok(res, { id }, 201);
}

export async function getIssuer(req: Request, res: Response) {
  const { id } = req.params;
  const row = await prisma.issuer.findUnique({ where: { id } });
  if (!row) return notFound(res);
  return ok(res, issuerRow(row));
}

export async function patchIssuer(req: Request, res: Response) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const { id } = req.params;
  const { name, description, email, website, logo_url } = (req.body ?? {}) as Record<string, unknown>;
  await prisma.issuer.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name as string }),
      ...(description !== undefined && { description: description as string | null }),
      ...(email !== undefined && { email: email as string | null }),
      ...(website !== undefined && { website: website as string | null }),
      ...(logo_url !== undefined && { logoUrl: logo_url as string | null }),
    },
  });
  return ok(res, { message: "Updated" });
}

export async function deleteIssuer(req: Request, res: Response) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  await prisma.issuer.delete({ where: { id: req.params.id } });
  return noContent(res);
}

export async function listBadgeClasses(_req: Request, res: Response) {
  const rows = await prisma.badgeClass.findMany({
    include: { issuer: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return ok(res, rows.map((bc) => badgeClassRow(bc, bc.issuer?.name ?? null)));
}

export async function postBadgeClass(req: Request, res: Response) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const body = parseJson(CreateBadgeClass, req.body ?? {}, res);
  if (!body) return;

  const id = uuidv4();
  await prisma.badgeClass.create({
    data: {
      id,
      issuerId: body.issuer_id,
      name: body.name,
      description: body.description ?? null,
      imageUrl: body.image_url ?? null,
      criteria: body.criteria ?? null,
      expiryDays: body.expiry_days ?? null,
    },
  });
  return ok(res, { id }, 201);
}

export async function getBadgeClass(req: Request, res: Response) {
  const row = await prisma.badgeClass.findFirst({
    where: { id: req.params.id },
    include: { issuer: { select: { name: true } } },
  });
  if (!row) return notFound(res);
  return ok(res, badgeClassRow(row, row.issuer?.name ?? null));
}

export async function patchBadgeClass(req: Request, res: Response) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const body = parseJson(PatchBadgeClass, req.body ?? {}, res);
  if (!body) return;

  const data: Prisma.BadgeClassUpdateInput = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.description !== undefined) data.description = body.description;
  if (body.image_url !== undefined) data.imageUrl = body.image_url;
  if (body.criteria !== undefined) data.criteria = body.criteria;
  if (body.expiry_days !== undefined) data.expiryDays = body.expiry_days;
  if (body.issuer_id !== undefined) {
    data.issuer = { connect: { id: body.issuer_id } };
  }

  await prisma.badgeClass.update({
    where: { id: req.params.id },
    data,
  });
  return ok(res, { message: "Updated" });
}

export async function deleteBadgeClass(req: Request, res: Response) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  await prisma.badgeClass.delete({ where: { id: req.params.id } });
  return noContent(res);
}

export async function listAssertionsMe(req: Request, res: Response) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const assertions = await prisma.assertion.findMany({
    where: { recipientId: auth.userId },
    include: {
      badgeClass: { include: { issuer: true } },
    },
    orderBy: { issuedAt: "desc" },
  });

  const ids = assertions.map((a) => a.id);
  const viewGroups =
    ids.length === 0
      ? []
      : await prisma.badgeView.groupBy({
          by: ["assertionId"],
          where: { assertionId: { in: ids } },
          _count: { _all: true },
        });
  const viewMap: Record<string, number> = {};
  for (const v of viewGroups) {
    viewMap[v.assertionId] = v._count._all;
  }

  const out = assertions.map((a) => ({
    id: a.id,
    badge_class_id: a.badgeClassId,
    recipient_id: a.recipientId,
    issued_at: a.issuedAt,
    expires_at: a.expiresAt,
    revoked: a.revoked,
    revocation_reason: a.revocationReason,
    evidence_url: a.evidenceUrl,
    badge_class: {
      id: a.badgeClass.id,
      name: a.badgeClass.name,
      description: a.badgeClass.description,
      image_url: a.badgeClass.imageUrl,
      criteria: a.badgeClass.criteria,
      issuer_id: a.badgeClass.issuerId,
      issuer: a.badgeClass.issuer
        ? { name: a.badgeClass.issuer.name, logo_url: a.badgeClass.issuer.logoUrl }
        : { name: null, logo_url: null },
    },
    views: viewMap[a.id] ?? 0,
  }));

  return ok(res, out);
}

export async function postAssertion(req: Request, res: Response) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const { recipient_id, badge_class_id, evidence_url, issued_at } = (req.body ?? {}) as Record<
    string,
    unknown
  >;
  if (!recipient_id || !badge_class_id) {
    return badRequest(res, "recipient_id and badge_class_id required");
  }

  const id = uuidv4();
  const issuedAt = issued_at ? new Date(String(issued_at)) : new Date();

  await prisma.$transaction([
    prisma.assertion.create({
      data: {
        id,
        badgeClassId: String(badge_class_id),
        recipientId: String(recipient_id),
        evidenceUrl: evidence_url ? String(evidence_url) : null,
        issuedAt,
      },
    }),
    prisma.auditLog.create({
      data: {
        id: uuidv4(),
        actorId: admin.userId,
        action: "assertion.create",
        entityType: "assertion",
        entityId: id,
      },
    }),
  ]);

  return ok(res, { id }, 201);
}

export async function getAssertionById(req: Request, res: Response) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const id = req.params.id;
  const rows = await prisma.$queryRaw<
    Record<string, unknown>[]
  >`SELECT a.*, bc.name AS badge_name, bc.expiry_days, p.full_name AS recipient_name, p.email AS recipient_email
    FROM assertions a
    JOIN badge_classes bc ON bc.id = a.badge_class_id
    LEFT JOIN users p ON p.id = a.recipient_id
    WHERE a.id = ${id}`;
  const first = rows[0];
  if (!first) return notFound(res);
  return ok(res, first);
}

export async function deleteAssertionById(req: Request, res: Response) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const { id } = req.params;
  await prisma.$transaction([
    prisma.assertion.delete({ where: { id } }),
    prisma.auditLog.create({
      data: {
        id: uuidv4(),
        actorId: admin.userId,
        action: "assertion.delete",
        entityType: "assertion",
        entityId: id,
      },
    }),
  ]);
  return noContent(res);
}

export async function patchAssertionById(req: Request, res: Response) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const { id } = req.params;
  const { revoked, revocation_reason } = (req.body ?? {}) as {
    revoked?: boolean;
    revocation_reason?: string;
  };

  const data: { revoked?: boolean; revocationReason?: string | null } = {};
  if (revoked !== undefined) data.revoked = revoked;
  if (revocation_reason !== undefined) data.revocationReason = revocation_reason;

  const ops = [];
  if (Object.keys(data).length > 0) {
    ops.push(prisma.assertion.update({ where: { id }, data }));
  }
  ops.push(
    prisma.auditLog.create({
      data: {
        id: uuidv4(),
        actorId: admin.userId,
        action: "assertion.update",
        entityType: "assertion",
        entityId: id,
      },
    })
  );
  await prisma.$transaction(ops);

  return ok(res, { message: "Updated" });
}
