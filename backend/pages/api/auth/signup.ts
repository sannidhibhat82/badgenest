import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { getPool } from "../../../database/connection";
import { signToken } from "../../../lib/auth";
import sql from "mssql";
import { z } from "zod";
import { withErrorHandling, withMethods, ok, badRequest } from "../../../lib/api/http";
import { parseJson } from "../../../lib/api/validate";
import { withRateLimit } from "../../../lib/api/rateLimit";

const BodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().trim().min(1).max(500).optional(),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const body = parseJson(BodySchema, req.body ?? {}, res);
  if (!body) return;

  const emailNorm = body.email.trim().toLowerCase();
  const id = uuidv4();

  const hash = await bcrypt.hash(body.password, 10);
  const pool = await getPool();

  try {
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, id)
      .input("email", sql.NVarChar(255), emailNorm)
      .input("password_hash", sql.NVarChar(255), hash)
      .input("full_name", sql.NVarChar(500), body.full_name ?? null)
      .query(
        `INSERT INTO users (id, email, password_hash, full_name)
         VALUES (@id, @email, @password_hash, @full_name)`
      );
  } catch (err: any) {
    // Unique constraint on users.email
    if (err?.number === 2627) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }
    throw err;
  }

  await pool
    .request()
    .input("user_id", sql.UniqueIdentifier, id)
    .input("role", sql.NVarChar(50), "learner")
    .query("INSERT INTO user_roles (user_id, role) VALUES (@user_id, @role)");

  const token = signToken(id, emailNorm);
  return ok(
    res,
    {
      token,
      user: {
        id,
        email: emailNorm,
        full_name: body.full_name ?? null,
        avatar_url: null,
      },
    },
    201
  );
}

export default withRateLimit({ windowMs: 60_000, max: 20, keyPrefix: "auth:signup" })(
  withErrorHandling(withMethods(["POST"], handler), { name: "auth.signup" })
);
