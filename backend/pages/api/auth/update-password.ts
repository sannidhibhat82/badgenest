import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import { getAuthFromRequest } from "../../../lib/auth";
import { getPool } from "../../../database/connection";
import sql from "mssql";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH" && req.method !== "POST") {
    res.setHeader("Allow", "PATCH, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const payload = getAuthFromRequest(req);
  if (!payload) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { password } = req.body ?? {};
  if (!password || String(password).length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const pool = await getPool();
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, payload.sub)
      .input("password_hash", sql.NVarChar(255), hash)
      .query("UPDATE users SET password_hash = @password_hash, updated_at = GETUTCDATE() WHERE id = @id");

    return res.status(200).json({ message: "Password updated" });
  } catch (err) {
    console.error("Update password error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
