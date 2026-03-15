import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import { getPool } from "../../../database/connection";
import { signToken } from "../../../lib/auth";
import sql from "mssql";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("email", sql.NVarChar(255), String(email).trim().toLowerCase())
      .query(
        "SELECT id, email, password_hash, full_name, avatar_url FROM users WHERE email = @email"
      );

    const user = result.recordset[0];
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = signToken(user.id, user.email);
    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
