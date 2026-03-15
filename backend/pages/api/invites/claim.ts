import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthFromRequest } from "../../../lib/auth";
import { getPool } from "../../../database/connection";
import sql from "mssql";
import { v4 as uuidv4 } from "uuid";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const payload = getAuthFromRequest(req);
  if (!payload) return res.status(401).json({ error: "Unauthorized" });

  const { invite_id } = req.body ?? {};
  if (!invite_id) return res.status(400).json({ error: "invite_id required" });

  try {
    const pool = await getPool();

    const inviteResult = await pool
      .request()
      .input("id", sql.UniqueIdentifier, invite_id)
      .query("SELECT id, badge_class_id, email, evidence_url, status FROM badge_invites WHERE id = @id");
    const invite = inviteResult.recordset[0];
    if (!invite) return res.status(404).json({ error: "Invite not found" });
    if (invite.status === "claimed") return res.status(400).json({ error: "Invite already claimed" });

    const userResult = await pool
      .request()
      .input("id", sql.UniqueIdentifier, payload.sub)
      .query("SELECT email FROM users WHERE id = @id");
    const user = userResult.recordset[0];
    if (!user || user.email?.toLowerCase() !== invite.email?.toLowerCase()) {
      return res.status(403).json({ error: "This invite was sent to a different email address" });
    }

    const assertionId = uuidv4();
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, assertionId)
      .input("badge_class_id", sql.UniqueIdentifier, invite.badge_class_id)
      .input("recipient_id", sql.UniqueIdentifier, payload.sub)
      .input("evidence_url", sql.NVarChar(2048), invite.evidence_url)
      .query(
        `INSERT INTO assertions (id, badge_class_id, recipient_id, evidence_url) VALUES (@id, @badge_class_id, @recipient_id, @evidence_url)`
      );

    await pool
      .request()
      .input("id", sql.UniqueIdentifier, invite_id)
      .input("claimed_by", sql.UniqueIdentifier, payload.sub)
      .query(
        `UPDATE badge_invites SET status = 'claimed', claimed_by = @claimed_by, claimed_at = GETUTCDATE() WHERE id = @id`
      );

    return res.status(200).json({ id: assertionId, message: "Badge claimed" });
  } catch (err) {
    console.error("Claim error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
