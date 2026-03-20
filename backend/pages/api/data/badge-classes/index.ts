import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../../../../lib/admin";
import { getPool } from "../../../../database/connection";
import sql from "mssql";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { withErrorHandling, withMethods, ok } from "../../../../lib/api/http";
import { parseJson } from "../../../../lib/api/validate";

const CreateSchema = z
  .object({
    issuer_id: z.string().uuid(),
    name: z.string().trim().min(1).max(500),
    description: z.string().trim().optional(),
    image_url: z.string().trim().url().max(2048).optional(),
    criteria: z.string().trim().optional(),
    expiry_days: z.number().int().positive().optional(),
  })
  .strict();

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const pool = await getPool();

  if (req.method === "GET") {
    const result = await pool
      .request()
      .query(
        "SELECT bc.*, i.name AS issuer_name FROM badge_classes bc LEFT JOIN issuers i ON i.id = bc.issuer_id ORDER BY bc.created_at DESC"
      );
    return ok(res, result.recordset);
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const body = parseJson(CreateSchema, req.body ?? {}, res);
  if (!body) return;

  const id = uuidv4();
  await pool
    .request()
    .input("id", sql.UniqueIdentifier, id)
    .input("issuer_id", sql.UniqueIdentifier, body.issuer_id)
    .input("name", sql.NVarChar(500), body.name)
    .input("description", sql.NVarChar(sql.MAX), body.description ?? null)
    .input("image_url", sql.NVarChar(2048), body.image_url ?? null)
    .input("criteria", sql.NVarChar(sql.MAX), body.criteria ?? null)
    .input("expiry_days", sql.Int, body.expiry_days ?? null)
    .query(
      "INSERT INTO badge_classes (id, issuer_id, name, description, image_url, criteria, expiry_days) VALUES (@id, @issuer_id, @name, @description, @image_url, @criteria, @expiry_days)"
    );

  return ok(res, { id }, 201);
}

export default withErrorHandling(withMethods(["GET", "POST"], handler), { name: "data.badgeClasses" });
