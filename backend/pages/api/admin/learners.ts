import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../../../lib/admin";
import { getPool } from "../../../database/connection";
import sql from "mssql";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    const pool = await getPool();
    const result = await pool.request().query(
      "SELECT id, full_name, email, avatar_url, created_at FROM users ORDER BY full_name"
    );
    return res.status(200).json(result.recordset);
  } catch (err) {
    console.error("Learners error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
