import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../../../lib/admin";
import { getPool } from "../../../database/connection";
import sql from "mssql";
import { v4 as uuidv4 } from "uuid";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    const pool = await getPool();

    if (req.method === "GET") {
      const result = await pool
        .request()
        .input("created_by", sql.UniqueIdentifier, admin.userId)
        .query("SELECT * FROM webhooks WHERE created_by = @created_by ORDER BY created_at DESC");
      return res.status(200).json(result.recordset);
    }

    const { url, events, secret } = req.body ?? {};
    if (!url) return res.status(400).json({ error: "url required" });
    const id = uuidv4();
    const eventsStr = Array.isArray(events) ? JSON.stringify(events) : (events ?? "[]");
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, id)
      .input("url", sql.NVarChar(2048), url)
      .input("events", sql.NVarChar(sql.MAX), eventsStr)
      .input("secret", sql.NVarChar(255), secret ?? "")
      .input("created_by", sql.UniqueIdentifier, admin.userId)
      .query(
        "INSERT INTO webhooks (id, url, events, secret, created_by) VALUES (@id, @url, @events, @secret, @created_by)"
      );
    return res.status(201).json({ id });
  } catch (err) {
    console.error("Webhooks error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
