import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "../../../../lib/admin";
import { getPool } from "../../../../database/connection";
import sql from "mssql";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { withErrorHandling, withMethods, ok, badRequest } from "../../../../lib/api/http";
import { parseJson } from "../../../../lib/api/validate";

const CreateSchema = z
  .object({
    name: z.string().trim().min(1).max(500),
    description: z.string().trim().optional(),
    email: z.string().trim().email().optional(),
    website: z.string().trim().url().max(2048).optional(),
    logo_url: z.string().trim().url().max(2048).optional(),
  })
  .strict();

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const pool = await getPool();

  if (req.method === "GET") {
    const result = await pool
      .request()
      .query("SELECT id, name, description, email, website, logo_url, created_at, updated_at FROM issuers ORDER BY created_at DESC");
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
    .input("name", sql.NVarChar(500), body.name)
    .input("description", sql.NVarChar(sql.MAX), body.description ?? null)
    .input("email", sql.NVarChar(255), body.email ?? null)
    .input("website", sql.NVarChar(2048), body.website ?? null)
    .input("logo_url", sql.NVarChar(2048), body.logo_url ?? null)
    .query(
      "INSERT INTO issuers (id, name, description, email, website, logo_url) VALUES (@id, @name, @description, @email, @website, @logo_url)"
    );

  return ok(res, { id }, 201);
}

export default withErrorHandling(withMethods(["GET", "POST"], handler), { name: "data.issuers" });
