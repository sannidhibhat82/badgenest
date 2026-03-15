import type { NextApiRequest, NextApiResponse } from "next";
import { requireAuth } from "../../../lib/admin";
import { getPool } from "../../../database/connection";
import sql from "mssql";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "PATCH") {
    res.setHeader("Allow", "GET, PATCH");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    const pool = await getPool();

    if (req.method === "GET") {
      const result = await pool
        .request()
        .input("id", sql.UniqueIdentifier, auth.userId)
        .query("SELECT id, email, full_name, avatar_url, created_at FROM users WHERE id = @id");
      const user = result.recordset[0];
      if (!user) return res.status(404).json({ error: "User not found" });
      return res.status(200).json(user);
    }

    const { full_name, avatar_url } = req.body ?? {};
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, auth.userId)
      .input("full_name", sql.NVarChar(500), full_name != null ? String(full_name) : undefined)
      .input("avatar_url", sql.NVarChar(2048), avatar_url != null ? String(avatar_url) : undefined)
      .query(
        `UPDATE users SET 
          full_name = COALESCE(@full_name, full_name),
          avatar_url = COALESCE(@avatar_url, avatar_url),
          updated_at = GETUTCDATE()
         WHERE id = @id`
      );
    return res.status(200).json({ message: "Updated" });
  } catch (err) {
    console.error("Users me error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
