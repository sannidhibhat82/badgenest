import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../../../../lib/admin";
import { getPool } from "../../../../database/connection";
import sql from "mssql";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== "string") return res.status(400).json({ error: "Invalid id" });

  if (req.method !== "GET" && req.method !== "PATCH" && req.method !== "DELETE") {
    res.setHeader("Allow", "GET, PATCH, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    const pool = await getPool();

    if (req.method === "GET") {
      const result = await pool
        .request()
        .input("id", sql.UniqueIdentifier, id)
        .query(
          `SELECT a.*, bc.name AS badge_name, bc.expiry_days, p.full_name AS recipient_name, p.email AS recipient_email
           FROM assertions a
           JOIN badge_classes bc ON bc.id = a.badge_class_id
           LEFT JOIN users p ON p.id = a.recipient_id
           WHERE a.id = @id`
        );
      const row = result.recordset[0];
      if (!row) return res.status(404).json({ error: "Not found" });
      return res.status(200).json(row);
    }

    if (req.method === "DELETE") {
      await pool.request().input("id", sql.UniqueIdentifier, id).query("DELETE FROM assertions WHERE id = @id");
      await pool
        .request()
        .input("actor_id", sql.UniqueIdentifier, admin.userId)
        .input("action", sql.NVarChar(255), "assertion.delete")
        .input("entity_type", sql.NVarChar(255), "assertion")
        .input("entity_id", sql.UniqueIdentifier, id)
        .query(
          "INSERT INTO audit_logs (actor_id, action, entity_type, entity_id) VALUES (@actor_id, @action, @entity_type, @entity_id)"
        );
      return res.status(204).end();
    }

    const { revoked, revocation_reason } = req.body ?? {};
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, id)
      .input("revoked", sql.Bit, revoked !== undefined ? (revoked ? 1 : 0) : undefined)
      .input("revocation_reason", sql.NVarChar(sql.MAX), revocation_reason)
      .query(
        `UPDATE assertions SET revoked = COALESCE(@revoked, revoked), revocation_reason = @revocation_reason, updated_at = GETUTCDATE() WHERE id = @id`
      );

    await pool
      .request()
      .input("actor_id", sql.UniqueIdentifier, admin.userId)
      .input("action", sql.NVarChar(255), "assertion.update")
      .input("entity_type", sql.NVarChar(255), "assertion")
      .input("entity_id", sql.UniqueIdentifier, id)
      .query(
        "INSERT INTO audit_logs (actor_id, action, entity_type, entity_id) VALUES (@actor_id, @action, @entity_type, @entity_id)"
      );

    return res.status(200).json({ message: "Updated" });
  } catch (err) {
    console.error("Assertion error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
