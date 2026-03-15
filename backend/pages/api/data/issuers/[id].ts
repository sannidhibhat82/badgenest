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
        .query("SELECT * FROM issuers WHERE id = @id");
      const row = result.recordset[0];
      if (!row) return res.status(404).json({ error: "Not found" });
      return res.status(200).json(row);
    }

    const admin = await requireAdmin(req, res);
    if (!admin) return;

    if (req.method === "DELETE") {
      await pool.request().input("id", sql.UniqueIdentifier, id).query("DELETE FROM issuers WHERE id = @id");
      return res.status(204).end();
    }

    const { name, description, email, website, logo_url } = req.body ?? {};
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, id)
      .input("name", sql.NVarChar(500), name)
      .input("description", sql.NVarChar(sql.MAX), description)
      .input("email", sql.NVarChar(255), email)
      .input("website", sql.NVarChar(2048), website)
      .input("logo_url", sql.NVarChar(2048), logo_url)
      .query(
        `UPDATE issuers SET name = COALESCE(@name, name), description = @description, email = @email, website = @website, logo_url = @logo_url, updated_at = GETUTCDATE() WHERE id = @id`
      );
    return res.status(200).json({ message: "Updated" });
  } catch (err) {
    console.error("Issuer error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
