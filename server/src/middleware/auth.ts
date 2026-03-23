import type { NextFunction, Request, Response } from "express";
import { verifyToken, type JwtPayload } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";
import { forbidden, unauthorized } from "../lib/http.js";

export function getBearerPayload(req: Request): JwtPayload | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  return verifyToken(auth.slice(7));
}

export async function requireAuth(req: Request, res: Response): Promise<{ userId: string } | null> {
  const payload = getBearerPayload(req);
  if (!payload) {
    unauthorized(res);
    return null;
  }
  return { userId: payload.sub };
}

export async function requireAdmin(req: Request, res: Response): Promise<{ userId: string } | null> {
  const payload = getBearerPayload(req);
  if (!payload) {
    unauthorized(res);
    return null;
  }
  const row = await prisma.userRole.findFirst({
    where: { userId: payload.sub, role: "admin" },
  });
  if (!row) {
    forbidden(res, "Admin access required");
    return null;
  }
  return { userId: payload.sub };
}
