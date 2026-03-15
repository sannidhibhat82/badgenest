import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../../../lib/admin";
import { getPool } from "../../../database/connection";
import sql from "mssql";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    const pool = await getPool();
    const result = await pool.request().query(
      `SELECT a.id, a.badge_class_id, a.recipient_id, a.issued_at, a.expires_at, a.revoked, a.revocation_reason, a.evidence_url,
              bc.name AS badge_name, bc.expiry_days,
              u.full_name AS recipient_name, u.email AS recipient_email
       FROM assertions a
       JOIN badge_classes bc ON bc.id = a.badge_class_id
       LEFT JOIN users u ON u.id = a.recipient_id
       ORDER BY a.issued_at DESC`
    );
    const rows = result.recordset as any[];
    const assertions = rows.map((r) => ({
      ...r,
      revoked: !!r.revoked,
    }));
    return res.status(200).json(assertions);
  } catch (err) {
    console.error("Admin assertions error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
