import type { NextApiRequest, NextApiResponse } from "next";
import { requireAuth } from "../../../lib/admin";
import { getPool } from "../../../database/connection";
import sql from "mssql";
import { z } from "zod";
import { withErrorHandling, withMethods, ok, badRequest } from "../../../lib/api/http";
import { parseJson } from "../../../lib/api/validate";

const PatchSchema = z
  .object({
    id: z.string().uuid().optional(),
    mark_all: z.boolean().optional(),
  })
  .strict();

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const pool = await getPool();

  if (req.method === "GET") {
    const result = await pool
      .request()
      .input("user_id", sql.UniqueIdentifier, auth.userId)
      .query(
        "SELECT id, user_id, title, message, [read], created_at FROM notifications WHERE user_id = @user_id ORDER BY created_at DESC"
      );
    const rows = result.recordset as any[];
    return ok(res, rows.map((r) => ({ ...r, read: !!r.read })));
  }

  const body = parseJson(PatchSchema, req.body ?? {}, res);
  if (!body) return;

  if (body.mark_all) {
    await pool
      .request()
      .input("user_id", sql.UniqueIdentifier, auth.userId)
      .query("UPDATE notifications SET [read] = 1 WHERE user_id = @user_id");
  } else if (body.id) {
    await pool
      .request()
      .input("id", sql.UniqueIdentifier, body.id)
      .input("user_id", sql.UniqueIdentifier, auth.userId)
      .query("UPDATE notifications SET [read] = 1 WHERE id = @id AND user_id = @user_id");
  } else {
    return badRequest(res, "id or mark_all required");
  }
  return ok(res, { message: "Updated" });
}

export default withErrorHandling(withMethods(["GET", "PATCH"], handler), { name: "notifications" });
