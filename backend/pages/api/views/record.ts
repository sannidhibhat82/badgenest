import type { NextApiRequest, NextApiResponse } from "next";
import { getPool } from "../../../database/connection";
import sql from "mssql";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { withErrorHandling, withMethods, ok, notFound } from "../../../lib/api/http";
import { parseJson } from "../../../lib/api/validate";

const BodySchema = z.object({ assertion_id: z.string().uuid() }).strict();

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const body = parseJson(BodySchema, req.body ?? {}, res);
  if (!body) return;

  const pool = await getPool();

  const exists = await pool
    .request()
    .input("id", sql.UniqueIdentifier, body.assertion_id)
    .query("SELECT 1 AS ok FROM assertions WHERE id = @id");
  if (!exists.recordset.length) return notFound(res, "Assertion not found");

  const id = uuidv4();
  await pool
    .request()
    .input("id", sql.UniqueIdentifier, id)
    .input("assertion_id", sql.UniqueIdentifier, body.assertion_id)
    .query("INSERT INTO badge_views (id, assertion_id) VALUES (@id, @assertion_id)");
  return ok(res, { id }, 201);
}

export default withErrorHandling(withMethods(["POST"], handler), { name: "views.record" });
