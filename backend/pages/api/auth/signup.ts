import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { getPool } from "../../../database/connection";
import { signToken } from "../../../lib/auth";
import sql from "mssql";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password, full_name } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const emailNorm = String(email).trim().toLowerCase();
  const id = uuidv4();

  try {
    const hash = await bcrypt.hash(password, 10);
    const pool = await getPool();

    await pool
      .request()
      .input("id", sql.UniqueIdentifier, id)
      .input("email", sql.NVarChar(255), emailNorm)
      .input("password_hash", sql.NVarChar(255), hash)
      .input("full_name", sql.NVarChar(500), full_name ? String(full_name).trim() : null)
      .query(
        `INSERT INTO users (id, email, password_hash, full_name)
         VALUES (@id, @email, @password_hash, @full_name)`
      );

    await pool
      .request()
      .input("user_id", sql.UniqueIdentifier, id)
      .input("role", sql.NVarChar(50), "learner")
      .query(
        `INSERT INTO user_roles (user_id, role) VALUES (@user_id, @role)`
      );

    const token = signToken(id, emailNorm);
    return res.status(201).json({
      token,
      user: {
        id,
        email: emailNorm,
        full_name: full_name ? String(full_name).trim() : null,
        avatar_url: null,
      },
    });
  } catch (err: any) {
    if (err?.number === 2627 || err?.code === "EREQUEST") {
      return res.status(409).json({ error: "An account with this email already exists" });
    }
    console.error("Signup error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
