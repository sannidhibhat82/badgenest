import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../../../../lib/admin";
import { getPool } from "../../../../database/connection";
import sql from "mssql";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== "string") return res.status(400).json({ error: "Invalid id" });

  if (req.method !== "PATCH") {
    res.setHeader("Allow", "PATCH");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    const pool = await getPool();
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, id)
      .input("created_by", sql.UniqueIdentifier, admin.userId)
      .query("UPDATE api_keys SET revoked = 1 WHERE id = @id AND created_by = @created_by");
    return res.status(200).json({ message: "Revoked" });
  } catch (err) {
    console.error("API key revoke error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
