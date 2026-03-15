import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../../../../lib/admin";
import { getPool } from "../../../../database/connection";
import sql from "mssql";
import { v4 as uuidv4 } from "uuid";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const pool = await getPool();

    if (req.method === "GET") {
      const result = await pool.request().query(
        `SELECT bc.*, i.name AS issuer_name FROM badge_classes bc LEFT JOIN issuers i ON i.id = bc.issuer_id ORDER BY bc.created_at DESC`
      );
      return res.status(200).json(result.recordset);
    }

    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const { issuer_id, name, description, image_url, criteria, expiry_days } = req.body ?? {};
    if (!issuer_id || !name) return res.status(400).json({ error: "issuer_id and name required" });

    const id = uuidv4();
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, id)
      .input("issuer_id", sql.UniqueIdentifier, issuer_id)
      .input("name", sql.NVarChar(500), name)
      .input("description", sql.NVarChar(sql.MAX), description ?? null)
      .input("image_url", sql.NVarChar(2048), image_url ?? null)
      .input("criteria", sql.NVarChar(sql.MAX), criteria ?? null)
      .input("expiry_days", sql.Int, expiry_days ?? null)
      .query(
        `INSERT INTO badge_classes (id, issuer_id, name, description, image_url, criteria, expiry_days) VALUES (@id, @issuer_id, @name, @description, @image_url, @criteria, @expiry_days)`
      );

    return res.status(201).json({ id });
  } catch (err) {
    console.error("Badge classes error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
