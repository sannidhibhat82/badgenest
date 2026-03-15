import type { NextApiRequest, NextApiResponse } from "next";
import { requireAuth, requireAdmin } from "../../../../lib/admin";
import { getPool } from "../../../../database/connection";
import sql from "mssql";
import { v4 as uuidv4 } from "uuid";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    const pool = await getPool();

    if (req.method === "GET") {
      const result = await pool
        .request()
        .input("recipient_id", sql.UniqueIdentifier, auth.userId)
        .query(
          `SELECT a.id, a.badge_class_id, a.recipient_id, a.issued_at, a.expires_at, a.revoked, a.revocation_reason, a.evidence_url,
                  bc.name AS badge_name, bc.description AS badge_description, bc.image_url AS badge_image_url, bc.criteria, bc.issuer_id,
                  i.name AS issuer_name, i.logo_url AS issuer_logo_url
           FROM assertions a
           JOIN badge_classes bc ON bc.id = a.badge_class_id
           LEFT JOIN issuers i ON i.id = bc.issuer_id
           WHERE a.recipient_id = @recipient_id
           ORDER BY a.issued_at DESC`
        );

      const rows = result.recordset as any[];
      const assertions = rows.map((r) => ({
        id: r.id,
        badge_class_id: r.badge_class_id,
        recipient_id: r.recipient_id,
        issued_at: r.issued_at,
        expires_at: r.expires_at,
        revoked: !!r.revoked,
        revocation_reason: r.revocation_reason,
        evidence_url: r.evidence_url,
        badge_class: {
          id: r.badge_class_id,
          name: r.badge_name,
          description: r.badge_description,
          image_url: r.badge_image_url,
          criteria: r.criteria,
          issuer_id: r.issuer_id,
          issuer: { name: r.issuer_name, logo_url: r.issuer_logo_url },
        },
      }));

      const viewResult = await pool
        .request()
        .input("recipient_id", sql.UniqueIdentifier, auth.userId)
        .query(
          `SELECT assertion_id, COUNT(*) AS cnt FROM badge_views bv
           JOIN assertions a ON a.id = bv.assertion_id AND a.recipient_id = @recipient_id
           GROUP BY assertion_id`
        );
      const viewMap: Record<string, number> = {};
      for (const v of (viewResult.recordset as any[])) {
        viewMap[v.assertion_id] = v.cnt;
      }

      const withViews = assertions.map((a) => ({ ...a, views: viewMap[a.id] ?? 0 }));
      return res.status(200).json(withViews);
    }

    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const { recipient_id, badge_class_id, evidence_url, issued_at } = req.body ?? {};
    if (!recipient_id || !badge_class_id) {
      return res.status(400).json({ error: "recipient_id and badge_class_id required" });
    }

    const id = uuidv4();
    const issuedAt = issued_at ? new Date(issued_at) : new Date();
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, id)
      .input("badge_class_id", sql.UniqueIdentifier, badge_class_id)
      .input("recipient_id", sql.UniqueIdentifier, recipient_id)
      .input("evidence_url", sql.NVarChar(2048), evidence_url || null)
      .input("issued_at", sql.DateTime2, issuedAt)
      .query(
        `INSERT INTO assertions (id, badge_class_id, recipient_id, evidence_url, issued_at)
         VALUES (@id, @badge_class_id, @recipient_id, @evidence_url, @issued_at)`
      );

    await pool
      .request()
      .input("actor_id", sql.UniqueIdentifier, admin.userId)
      .input("action", sql.NVarChar(255), "assertion.create")
      .input("entity_type", sql.NVarChar(255), "assertion")
      .input("entity_id", sql.UniqueIdentifier, id)
      .query(
        `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id) VALUES (@actor_id, @action, @entity_type, @entity_id)`
      );

    return res.status(201).json({ id });
  } catch (err) {
    console.error("Assertions error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
