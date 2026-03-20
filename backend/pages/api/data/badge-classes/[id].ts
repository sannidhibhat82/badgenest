import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../../../../lib/admin";
import { getPool } from "../../../../database/connection";
import sql from "mssql";
import { z } from "zod";
import { withErrorHandling, withMethods, ok, notFound, noContent } from "../../../../lib/api/http";
import { parseJson } from "../../../../lib/api/validate";
import { requireStringQuery } from "../../../../lib/api/params";

const PatchSchema = z
  .object({
    issuer_id: z.string().uuid().optional(),
    name: z.string().trim().min(1).max(500).optional(),
    description: z.string().trim().optional().nullable(),
    image_url: z.string().trim().url().max(2048).optional().nullable(),
    criteria: z.string().trim().optional().nullable(),
    expiry_days: z.number().int().positive().optional().nullable(),
  })
  .strict();

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = requireStringQuery(req, res, "id");
  if (!id) return;

  const pool = await getPool();

  if (req.method === "GET") {
    const result = await pool
      .request()
      .input("id", sql.UniqueIdentifier, id)
      .query(
        "SELECT bc.*, i.name AS issuer_name FROM badge_classes bc LEFT JOIN issuers i ON i.id = bc.issuer_id WHERE bc.id = @id"
      );
    const row = result.recordset[0];
    if (!row) return notFound(res);
    return ok(res, row);
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method === "DELETE") {
    await pool.request().input("id", sql.UniqueIdentifier, id).query("DELETE FROM badge_classes WHERE id = @id");
    return noContent(res);
  }

  const body = parseJson(PatchSchema, req.body ?? {}, res);
  if (!body) return;

  await pool
    .request()
    .input("id", sql.UniqueIdentifier, id)
    .input("name", sql.NVarChar(500), body.name ?? null)
    .input("description", sql.NVarChar(sql.MAX), body.description ?? null)
    .input("image_url", sql.NVarChar(2048), body.image_url ?? null)
    .input("criteria", sql.NVarChar(sql.MAX), body.criteria ?? null)
    .input("expiry_days", sql.Int, body.expiry_days ?? null)
    .input("issuer_id", sql.UniqueIdentifier, body.issuer_id ?? null)
    .query(
      `UPDATE badge_classes SET
        name = COALESCE(@name, name),
        description = COALESCE(@description, description),
        image_url = COALESCE(@image_url, image_url),
        criteria = COALESCE(@criteria, criteria),
        expiry_days = COALESCE(@expiry_days, expiry_days),
        issuer_id = COALESCE(@issuer_id, issuer_id),
        updated_at = GETUTCDATE()
       WHERE id = @id`
    );

  return ok(res, { message: "Updated" });
}

export default withErrorHandling(withMethods(["GET", "PATCH", "DELETE"], handler), {
  name: "data.badgeClasses.id",
});
