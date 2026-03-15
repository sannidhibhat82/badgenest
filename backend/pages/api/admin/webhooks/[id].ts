import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../../../../lib/admin";
import { getPool } from "../../../../database/connection";
import sql from "mssql";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== "string") return res.status(400).json({ error: "Invalid id" });

  if (req.method !== "PATCH" && req.method !== "DELETE") {
    res.setHeader("Allow", "PATCH, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    const pool = await getPool();

    if (req.method === "DELETE") {
      await pool.request().input("id", sql.UniqueIdentifier, id).input("created_by", sql.UniqueIdentifier, admin.userId).query("DELETE FROM webhooks WHERE id = @id AND created_by = @created_by");
      return res.status(204).end();
    }

    const { active } = req.body ?? {};
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, id)
      .input("created_by", sql.UniqueIdentifier, admin.userId)
      .input("active", sql.Bit, active ? 1 : 0)
      .query("UPDATE webhooks SET active = @active, updated_at = GETUTCDATE() WHERE id = @id AND created_by = @created_by");
    return res.status(200).json({ message: "Updated" });
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
