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

  try {
    const pool = await getPool();

    if (req.method === "GET") {
      const result = await pool
        .request()
        .input("id", sql.UniqueIdentifier, id)
        .query(
          "SELECT bc.*, i.name AS issuer_name FROM badge_classes bc LEFT JOIN issuers i ON i.id = bc.issuer_id WHERE bc.id = @id"
        );
      const row = result.recordset[0];
      if (!row) return res.status(404).json({ error: "Not found" });
      return res.status(200).json(row);
    }

    const admin = await requireAdmin(req, res);
    if (!admin) return;

    if (req.method === "DELETE") {
      await pool.request().input("id", sql.UniqueIdentifier, id).query("DELETE FROM badge_classes WHERE id = @id");
      return res.status(204).end();
    }

    const { name, description, image_url, criteria, expiry_days, issuer_id } = req.body ?? {};
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, id)
      .input("name", sql.NVarChar(500), name)
      .input("description", sql.NVarChar(sql.MAX), description)
      .input("image_url", sql.NVarChar(2048), image_url)
      .input("criteria", sql.NVarChar(sql.MAX), criteria)
      .input("expiry_days", sql.Int, expiry_days)
      .input("issuer_id", sql.UniqueIdentifier, issuer_id)
      .query(
        `UPDATE badge_classes SET name = COALESCE(@name, name), description = @description, image_url = @image_url, criteria = @criteria, expiry_days = @expiry_days, issuer_id = COALESCE(@issuer_id, issuer_id), updated_at = GETUTCDATE() WHERE id = @id`
      );
    return res.status(200).json({ message: "Updated" });
  } catch (err) {
    console.error("Badge class error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
