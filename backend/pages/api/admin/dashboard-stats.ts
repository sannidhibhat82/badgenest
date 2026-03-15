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

    const [badgesRes, activeRes, revokedRes, learnersRes, recentRes] = await Promise.all([
      pool.request().query("SELECT COUNT(*) AS cnt FROM badge_classes"),
      pool.request().query("SELECT COUNT(*) AS cnt FROM assertions WHERE revoked = 0"),
      pool.request().query("SELECT COUNT(*) AS cnt FROM assertions WHERE revoked = 1"),
      pool.request().query("SELECT COUNT(*) AS cnt FROM users"),
      pool.request().query(
        `SELECT TOP 10 a.id, a.issued_at, a.revoked, u.full_name AS learner_name, bc.name AS badge_name
         FROM assertions a
         LEFT JOIN users u ON u.id = a.recipient_id
         LEFT JOIN badge_classes bc ON bc.id = a.badge_class_id
         ORDER BY a.issued_at DESC`
      ),
    ]);

    const total_badges = (badgesRes.recordset[0] as any).cnt;
    const active_assertions = (activeRes.recordset[0] as any).cnt;
    const revoked_assertions = (revokedRes.recordset[0] as any).cnt;
    const total_learners = (learnersRes.recordset[0] as any).cnt;
    const recent = (recentRes.recordset as any[]).map((r) => ({
      id: r.id,
      issued_at: r.issued_at,
      revoked: !!r.revoked,
      learner_name: r.learner_name ?? "Unknown",
      badge_name: r.badge_name ?? "Unknown",
    }));

    return res.status(200).json({
      total_badges,
      active_assertions,
      revoked_assertions,
      total_learners,
      chart_data: [],
      recent,
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
