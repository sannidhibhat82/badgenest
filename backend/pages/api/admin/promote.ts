import type { NextApiRequest, NextApiResponse } from "next";
import sql from "mssql";
import { z } from "zod";
import { getPool } from "../../../database/connection";
import { requireAdmin } from "../../../lib/admin";
import { getEnv } from "../../../lib/api/env";
import { parseJson } from "../../../lib/api/validate";
import { withErrorHandling, withMethods, ok, badRequest, forbidden, notFound } from "../../../lib/api/http";

const BodySchema = z
  .object({
    email: z.string().email(),
  })
  .strict();

async function anyAdminExists(): Promise<boolean> {
  const pool = await getPool();
  const r = await pool
    .request()
    .input("role", sql.NVarChar(50), "admin")
    .query("SELECT TOP 1 1 AS ok FROM user_roles WHERE role = @role");
  return r.recordset.length > 0;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const body = parseJson(BodySchema, req.body ?? {}, res);
  if (!body) return;

  const pool = await getPool();
  const emailNorm = body.email.trim().toLowerCase();

  // Authorization:
  // - If at least one admin exists, this endpoint requires an existing admin JWT.
  // - If no admins exist yet (fresh install), allow bootstrapping with ADMIN_BOOTSTRAP_SECRET.
  const hasAdmin = await anyAdminExists();
  if (hasAdmin) {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
  } else {
    const expected = getEnv("ADMIN_BOOTSTRAP_SECRET");
    if (!expected) {
      return forbidden(
        res,
        "No admin exists yet. Set ADMIN_BOOTSTRAP_SECRET in backend env to bootstrap the first admin."
      );
    }
    const provided = String(req.headers["x-bootstrap-secret"] ?? "");
    if (provided !== expected) {
      return forbidden(res, "Invalid bootstrap secret");
    }
  }

  const userRes = await pool
    .request()
    .input("email", sql.NVarChar(255), emailNorm)
    .query("SELECT id, email FROM users WHERE email = @email");

  const user = userRes.recordset[0] as any;
  if (!user) return notFound(res, "User not found");

  // Idempotent role assignment
  const existing = await pool
    .request()
    .input("user_id", sql.UniqueIdentifier, user.id)
    .input("role", sql.NVarChar(50), "admin")
    .query("SELECT 1 AS ok FROM user_roles WHERE user_id = @user_id AND role = @role");

  if (!existing.recordset.length) {
    await pool
      .request()
      .input("user_id", sql.UniqueIdentifier, user.id)
      .input("role", sql.NVarChar(50), "admin")
      .query("INSERT INTO user_roles (user_id, role) VALUES (@user_id, @role)");
  }

  return ok(res, { message: "User promoted to admin", user: { id: user.id, email: user.email } });
}

export default withErrorHandling(withMethods(["POST"], handler), { name: "admin.promote" });

