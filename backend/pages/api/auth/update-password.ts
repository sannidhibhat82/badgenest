import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import { getAuthFromRequest } from "../../../lib/auth";
import { getPool } from "../../../database/connection";
import sql from "mssql";
import { z } from "zod";
import { withErrorHandling, withMethods, ok, unauthorized } from "../../../lib/api/http";
import { parseJson } from "../../../lib/api/validate";

const BodySchema = z.object({
  password: z.string().min(6),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const payload = getAuthFromRequest(req);
  if (!payload) {
    return unauthorized(res);
  }

  const body = parseJson(BodySchema, req.body ?? {}, res);
  if (!body) return;

  const hash = await bcrypt.hash(body.password, 10);
  const pool = await getPool();
  await pool
    .request()
    .input("id", sql.UniqueIdentifier, payload.sub)
    .input("password_hash", sql.NVarChar(255), hash)
    .query("UPDATE users SET password_hash = @password_hash, updated_at = GETUTCDATE() WHERE id = @id");

  return ok(res, { message: "Password updated" });
}

export default withErrorHandling(withMethods(["PATCH", "POST"], handler), { name: "auth.updatePassword" });
