import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthFromRequest } from "../../../lib/auth";
import { getPool } from "../../../database/connection";
import sql from "mssql";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { withErrorHandling, withMethods, ok, badRequest, unauthorized, forbidden, notFound } from "../../../lib/api/http";
import { parseJson } from "../../../lib/api/validate";

const BodySchema = z.object({ invite_id: z.string().uuid() }).strict();

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const payload = getAuthFromRequest(req);
  if (!payload) return unauthorized(res);

  const body = parseJson(BodySchema, req.body ?? {}, res);
  if (!body) return;

  const pool = await getPool();

  const inviteResult = await pool
    .request()
    .input("id", sql.UniqueIdentifier, body.invite_id)
    .query("SELECT id, badge_class_id, email, evidence_url, status FROM badge_invites WHERE id = @id");
  const invite = inviteResult.recordset[0] as any;
  if (!invite) return notFound(res, "Invite not found");
  if (invite.status === "claimed") return badRequest(res, "Invite already claimed");

  const userResult = await pool
    .request()
    .input("id", sql.UniqueIdentifier, payload.sub)
    .query("SELECT email FROM users WHERE id = @id");
  const user = userResult.recordset[0] as any;
  if (!user || user.email?.toLowerCase() !== invite.email?.toLowerCase()) {
    return forbidden(res, "This invite was sent to a different email address");
  }

  const assertionId = uuidv4();
  await pool
    .request()
    .input("id", sql.UniqueIdentifier, assertionId)
    .input("badge_class_id", sql.UniqueIdentifier, invite.badge_class_id)
    .input("recipient_id", sql.UniqueIdentifier, payload.sub)
    .input("evidence_url", sql.NVarChar(2048), invite.evidence_url)
    .query(
      "INSERT INTO assertions (id, badge_class_id, recipient_id, evidence_url) VALUES (@id, @badge_class_id, @recipient_id, @evidence_url)"
    );

  await pool
    .request()
    .input("id", sql.UniqueIdentifier, body.invite_id)
    .input("claimed_by", sql.UniqueIdentifier, payload.sub)
    .query("UPDATE badge_invites SET status = 'claimed', claimed_by = @claimed_by, claimed_at = GETUTCDATE() WHERE id = @id");

  return ok(res, { id: assertionId, message: "Badge claimed" });
}

export default withErrorHandling(withMethods(["POST"], handler), { name: "invites.claim" });
