import type { NextApiRequest, NextApiResponse } from "next";
import { getPool } from "../../../database/connection";
import sql from "mssql";
import { v4 as uuidv4 } from "uuid";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { assertion_id } = req.body ?? {};
  if (!assertion_id) return res.status(400).json({ error: "assertion_id required" });

  try {
    const pool = await getPool();
    const id = uuidv4();
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, id)
      .input("assertion_id", sql.UniqueIdentifier, assertion_id)
      .query("INSERT INTO badge_views (id, assertion_id) VALUES (@id, @assertion_id)");
    return res.status(201).json({ id });
  } catch (err) {
    console.error("Record view error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
