import type { NextApiRequest, NextApiResponse } from "next";
import { getPool } from "../../../database/connection";
import sql from "mssql";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { assertionId } = req.query;
  if (typeof assertionId !== "string") return res.status(400).json({ error: "Invalid assertionId" });

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("id", sql.UniqueIdentifier, assertionId)
      .query(
        `SELECT a.id, a.badge_class_id, a.recipient_id, a.issued_at, a.expires_at, a.revoked, a.revocation_reason, a.evidence_url, a.signature,
                bc.id AS bc_id, bc.name AS bc_name, bc.description AS bc_description, bc.image_url AS bc_image_url, bc.criteria, bc.issuer_id,
                i.id AS issuer_id, i.name AS issuer_name, i.logo_url AS issuer_logo_url,
                u.full_name AS recipient_name, u.avatar_url AS recipient_avatar_url
         FROM assertions a
         JOIN badge_classes bc ON bc.id = a.badge_class_id
         LEFT JOIN issuers i ON i.id = bc.issuer_id
         LEFT JOIN users u ON u.id = a.recipient_id
         WHERE a.id = @id`
      );

    const row = result.recordset[0];
    if (!row) return res.status(404).json({ error: "Assertion not found" });

    const viewCount = await pool
      .request()
      .input("assertion_id", sql.UniqueIdentifier, assertionId)
      .query("SELECT COUNT(*) AS cnt FROM badge_views WHERE assertion_id = @assertion_id");
    const count = (viewCount.recordset[0] as any).cnt;

    return res.status(200).json({
      assertion: {
        id: row.id,
        badge_class_id: row.badge_class_id,
        recipient_id: row.recipient_id,
        issued_at: row.issued_at,
        expires_at: row.expires_at,
        revoked: !!row.revoked,
        revocation_reason: row.revocation_reason,
        evidence_url: row.evidence_url,
        signature: row.signature,
      },
      badge_class: {
        id: row.bc_id,
        name: row.bc_name,
        description: row.bc_description,
        image_url: row.bc_image_url,
        criteria: row.criteria,
        issuer_id: row.issuer_id,
      },
      issuer: { id: row.issuer_id, name: row.issuer_name, logo_url: row.issuer_logo_url },
      recipient: { full_name: row.recipient_name, avatar_url: row.recipient_avatar_url },
      view_count: count,
    });
  } catch (err) {
    console.error("Verify error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
