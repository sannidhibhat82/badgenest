import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
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
        .query("SELECT id, key_prefix, name, created_at, expires_at, last_used_at, revoked FROM api_keys WHERE created_by = @created_by ORDER BY created_at DESC");
      return res.status(200).json(result.recordset);
    }

    const { name } = req.body ?? {};
    if (!name) return res.status(400).json({ error: "name required" });

    const rawKey = `bn_${crypto.randomBytes(24).toString("hex")}`;
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
    const keyPrefix = rawKey.slice(0, 12);
    const id = uuidv4();

    await pool
      .request()
      .input("id", sql.UniqueIdentifier, id)
      .input("key_hash", sql.NVarChar(255), keyHash)
      .input("key_prefix", sql.NVarChar(20), keyPrefix)
      .input("name", sql.NVarChar(255), name)
      .input("created_by", sql.UniqueIdentifier, admin.userId)
      .query(
        "INSERT INTO api_keys (id, key_hash, key_prefix, name, created_by) VALUES (@id, @key_hash, @key_prefix, @name, @created_by)"
      );

    return res.status(201).json({ id, key: rawKey, key_prefix: keyPrefix });
  } catch (err) {
    console.error("API keys error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
