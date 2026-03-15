import type { NextApiRequest, NextApiResponse } from "next";
import { v4 as uuidv4 } from "uuid";
import { requireAdmin, requireAuth } from "../../../lib/admin";
import { getPool } from "../../../database/connection";
import sql from "mssql";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const pool = await getPool();

    if (req.method === "POST") {
      const auth = await requireAuth(req, res);
      if (!auth) return;
      const { action, entity_type, entity_id, details } = req.body ?? {};
      if (!action || !entity_type) return res.status(400).json({ error: "action and entity_type required" });
      const id = uuidv4();
      await pool
        .request()
        .input("id", sql.UniqueIdentifier, id)
        .input("actor_id", sql.UniqueIdentifier, auth.userId)
        .input("action", sql.NVarChar(255), action)
        .input("entity_type", sql.NVarChar(255), entity_type)
        .input("entity_id", sql.UniqueIdentifier, entity_id ?? null)
        .input("details", sql.NVarChar(sql.MAX), details ? JSON.stringify(details) : null)
        .query(
          "INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, details) VALUES (@id, @actor_id, @action, @entity_type, @entity_id, @details)"
        );
      return res.status(201).json({ id });
    }

    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const result = await pool.request().query(
      `SELECT al.id, al.actor_id, al.action, al.entity_type, al.entity_id, al.details, al.created_at, u.full_name AS actor_name
       FROM audit_logs al LEFT JOIN users u ON u.id = al.actor_id ORDER BY al.created_at DESC`
    );
    return res.status(200).json(result.recordset);
  } catch (err) {
    console.error("Audit logs error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
