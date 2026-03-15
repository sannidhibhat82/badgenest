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
        "SELECT id, name, description, email, website, logo_url, created_at, updated_at FROM issuers ORDER BY created_at DESC"
      );
      return res.status(200).json(result.recordset);
    }

    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const { name, description, email, website, logo_url } = req.body ?? {};
    if (!name) return res.status(400).json({ error: "name required" });

    const id = uuidv4();
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, id)
      .input("name", sql.NVarChar(500), name)
      .input("description", sql.NVarChar(sql.MAX), description ?? null)
      .input("email", sql.NVarChar(255), email ?? null)
      .input("website", sql.NVarChar(2048), website ?? null)
      .input("logo_url", sql.NVarChar(2048), logo_url ?? null)
      .query(
        `INSERT INTO issuers (id, name, description, email, website, logo_url) VALUES (@id, @name, @description, @email, @website, @logo_url)`
      );

    return res.status(201).json({ id });
  } catch (err) {
    console.error("Issuers error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
