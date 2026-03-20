import type { NextApiRequest, NextApiResponse } from "next";
import { getPool } from "../../../database/connection";
import sql from "mssql";
import { withErrorHandling, withMethods, ok, notFound } from "../../../lib/api/http";
import { requireStringQuery } from "../../../lib/api/params";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = requireStringQuery(req, res, "token");
  if (!token) return;

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

  const row = result.recordset[0] as any;
  if (!row) return notFound(res, "Invite not found");

  const maskedEmail = row.email ? String(row.email).replace(/(.).*@/, "$1***@") : "";
  return ok(res, {
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
}

export default withErrorHandling(withMethods(["GET"], handler), { name: "invites.token" });
