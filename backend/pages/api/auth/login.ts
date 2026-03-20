import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import { getPool } from "../../../database/connection";
import { signToken } from "../../../lib/auth";
import sql from "mssql";
import { z } from "zod";
import { withErrorHandling, withMethods, ok, badRequest, unauthorized } from "../../../lib/api/http";
import { parseJson } from "../../../lib/api/validate";
import { withRateLimit } from "../../../lib/api/rateLimit";

const BodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const body = parseJson(BodySchema, req.body ?? {}, res);
  if (!body) return;

  const emailNorm = body.email.trim().toLowerCase();

  const pool = await getPool();
  const result = await pool
    .request()
    .input("email", sql.NVarChar(255), emailNorm)
    .query("SELECT id, email, password_hash, full_name, avatar_url FROM users WHERE email = @email");

  const user = result.recordset[0] as any;
  if (!user) return unauthorized(res, "Invalid email or password");

  const valid = await bcrypt.compare(body.password, user.password_hash);
  if (!valid) return unauthorized(res, "Invalid email or password");

  const token = signToken(user.id, user.email);
  return ok(res, {
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
    },
  });
}

export default withRateLimit({ windowMs: 60_000, max: 30, keyPrefix: "auth:login" })(
  withErrorHandling(withMethods(["POST"], handler), { name: "auth.login" })
);
