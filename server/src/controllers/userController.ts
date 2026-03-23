import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { ok, notFound } from "../lib/http.js";
import { parseJson } from "../lib/validate.js";
import { requireAuth } from "../middleware/auth.js";

const PatchMe = z
  .object({
    full_name: z.string().trim().min(1).max(500).optional(),
    avatar_url: z.string().trim().url().max(2048).optional(),
  })
  .strict();

export async function getMe(req: Request, res: Response) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, email: true, fullName: true, avatarUrl: true, createdAt: true },
  });
  if (!user) return notFound(res, "User not found");

  return ok(res, {
    id: user.id,
    email: user.email,
    full_name: user.fullName,
    avatar_url: user.avatarUrl,
    created_at: user.createdAt,
  });
}

export async function patchMe(req: Request, res: Response) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const body = parseJson(PatchMe, req.body ?? {}, res);
  if (!body) return;

  const data: { fullName?: string | null; avatarUrl?: string | null } = {};
  if (body.full_name !== undefined) data.fullName = body.full_name;
  if (body.avatar_url !== undefined) data.avatarUrl = body.avatar_url;

  await prisma.user.update({
    where: { id: auth.userId },
    data,
  });
  return ok(res, { message: "Updated" });
}
