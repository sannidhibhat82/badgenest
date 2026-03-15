import type { NextApiRequest, NextApiResponse } from "next";
import { getPool } from "../../../database/connection";
import sql from "mssql";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { token } = req.query;
  if (typeof token !== "string") return res.status(400).json({ error: "Invalid token" });

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("token", sql.NVarChar(255), token)
      .query(
        `SELECT bi.id, bi.badge_class_id, bi.status, bi.email, bi.evidence_url,
                bc.name AS badge_name, bc.description AS badge_description, bc.image_url AS badge_image_url,
                i.name AS issuer_name, i.logo_url AS issuer_logo_url
         FROM badge_invites bi
         LEFT JOIN badge_classes bc ON bc.id = bi.badge_class_id
         LEFT JOIN issuers i ON i.id = bc.issuer_id
         WHERE bi.invite_token = @token`
      );

    const row = result.recordset[0];
    if (!row) return res.status(404).json({ error: "Invite not found" });

    const maskedEmail = row.email ? row.email.replace(/(.).*@/, "$1***@") : "";

    return res.status(200).json({
      id: row.id,
      badge_class_id: row.badge_class_id,
      status: row.status,
      masked_email: maskedEmail,
      evidence_url: row.evidence_url,
      badge_classes: {
        name: row.badge_name,
        description: row.badge_description,
        image_url: row.badge_image_url,
      },
      issuer: { name: row.issuer_name, logo_url: row.issuer_logo_url },
    });
  } catch (err) {
    console.error("Invite error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
