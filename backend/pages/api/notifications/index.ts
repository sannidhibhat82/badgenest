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
        .input("user_id", sql.UniqueIdentifier, auth.userId)
        .query(
          "SELECT id, user_id, title, message, [read], created_at FROM notifications WHERE user_id = @user_id ORDER BY created_at DESC"
        );
      const rows = result.recordset as any[];
      return res.status(200).json(rows.map((r) => ({ ...r, read: !!r.read })));
    }

    const { id, mark_all } = req.body ?? {};
    if (mark_all) {
      await pool
        .request()
        .input("user_id", sql.UniqueIdentifier, auth.userId)
        .query("UPDATE notifications SET [read] = 1 WHERE user_id = @user_id");
    } else if (id) {
      await pool
        .request()
        .input("id", sql.UniqueIdentifier, id)
        .input("user_id", sql.UniqueIdentifier, auth.userId)
        .query("UPDATE notifications SET [read] = 1 WHERE id = @id AND user_id = @user_id");
    } else {
      return res.status(400).json({ error: "id or mark_all required" });
    }
    return res.status(200).json({ message: "Updated" });
  } catch (err) {
    console.error("Notifications error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
