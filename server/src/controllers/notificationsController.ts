import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { ok, badRequest } from "../lib/http.js";
import { parseJson } from "../lib/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { notificationRow } from "../lib/serialize.js";

const PatchSchema = z
  .object({
    id: z.string().uuid().optional(),
    mark_all: z.boolean().optional(),
  })
  .strict();

export async function listNotifications(req: Request, res: Response) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const rows = await prisma.notification.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: "desc" },
  });
  return ok(res, rows.map(notificationRow));
}

export async function patchNotifications(req: Request, res: Response) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const body = parseJson(PatchSchema, req.body ?? {}, res);
  if (!body) return;

  if (body.mark_all) {
    await prisma.notification.updateMany({
      where: { userId: auth.userId },
      data: { read: true },
    });
  } else if (body.id) {
    await prisma.notification.updateMany({
      where: { id: body.id, userId: auth.userId },
      data: { read: true },
    });
  } else {
    return badRequest(res, "id or mark_all required");
  }
  return ok(res, { message: "Updated" });
}
