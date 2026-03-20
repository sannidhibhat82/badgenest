import type { NextApiRequest, NextApiResponse } from "next";
import { requireAuth } from "../../../lib/admin";
import { getPool } from "../../../database/connection";
import sql from "mssql";
import { z } from "zod";
import { withErrorHandling, withMethods, ok, notFound } from "../../../lib/api/http";
import { parseJson } from "../../../lib/api/validate";

const PatchSchema = z
  .object({
    full_name: z.string().trim().min(1).max(500).optional(),
    avatar_url: z.string().trim().url().max(2048).optional(),
  })
  .strict();

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const pool = await getPool();

  if (req.method === "GET") {
    const result = await pool
      .request()
      .input("id", sql.UniqueIdentifier, auth.userId)
      .query("SELECT id, email, full_name, avatar_url, created_at FROM users WHERE id = @id");
    const user = result.recordset[0];
    if (!user) return notFound(res, "User not found");
    return ok(res, user);
  }

  const body = parseJson(PatchSchema, req.body ?? {}, res);
  if (!body) return;

  await pool
    .request()
    .input("id", sql.UniqueIdentifier, auth.userId)
    .input("full_name", sql.NVarChar(500), body.full_name ?? null)
    .input("avatar_url", sql.NVarChar(2048), body.avatar_url ?? null)
    .query(
      `UPDATE users SET 
        full_name = COALESCE(@full_name, full_name),
        avatar_url = COALESCE(@avatar_url, avatar_url),
        updated_at = GETUTCDATE()
       WHERE id = @id`
    );
  return ok(res, { message: "Updated" });
}

export default withErrorHandling(withMethods(["GET", "PATCH"], handler), { name: "users.me" });
