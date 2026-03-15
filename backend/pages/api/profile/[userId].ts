import type { NextApiRequest, NextApiResponse } from "next";
import { getPool } from "../../../database/connection";
import sql from "mssql";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId } = req.query;
  if (typeof userId !== "string") return res.status(400).json({ error: "Invalid userId" });

  try {
    const pool = await getPool();

    const profileResult = await pool
      .request()
      .input("user_id", sql.UniqueIdentifier, userId)
      .query("SELECT id, full_name, avatar_url, created_at FROM users WHERE id = @user_id");
    const profile = profileResult.recordset[0];
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    const assertionsResult = await pool
      .request()
      .input("recipient_id", sql.UniqueIdentifier, userId)
      .query(
        `SELECT a.id, a.badge_class_id, a.issued_at, a.expires_at, a.revoked, a.evidence_url,
                bc.id AS bc_id, bc.name AS bc_name, bc.description AS bc_description, bc.image_url AS bc_image_url, bc.issuer_id,
                i.name AS issuer_name, i.logo_url AS issuer_logo_url
         FROM assertions a
         JOIN badge_classes bc ON bc.id = a.badge_class_id
         LEFT JOIN issuers i ON i.id = bc.issuer_id
         WHERE a.recipient_id = @recipient_id AND a.revoked = 0
         ORDER BY a.issued_at DESC`
      );

    const viewResult = await pool.request().query("SELECT assertion_id FROM badge_views");
    const viewMap: Record<string, number> = {};
    for (const v of (viewResult.recordset as any[])) {
      viewMap[v.assertion_id] = (viewMap[v.assertion_id] || 0) + 1;
    }

    const assertions = (assertionsResult.recordset as any[]).map((r) => ({
      id: r.id,
      badge_class_id: r.badge_class_id,
      issued_at: r.issued_at,
      expires_at: r.expires_at,
      revoked: !!r.revoked,
      evidence_url: r.evidence_url,
      badge: {
        id: r.bc_id,
        name: r.bc_name,
        description: r.bc_description,
        image_url: r.bc_image_url,
        issuer_id: r.issuer_id,
        issuer: { name: r.issuer_name, logo_url: r.issuer_logo_url },
      },
      views: viewMap[r.id] ?? 0,
    }));

    return res.status(200).json({
      profile: {
        user_id: profile.id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        created_at: profile.created_at,
      },
      assertions,
      totalViews: Object.values(viewMap).reduce((s, v) => s + v, 0),
    });
  } catch (err) {
    console.error("Profile error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
