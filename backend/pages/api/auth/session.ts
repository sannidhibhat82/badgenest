import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthFromRequest } from "../../../lib/auth";
import { getPool } from "../../../database/connection";
import sql from "mssql";
import { withErrorHandling, withMethods, ok } from "../../../lib/api/http";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const payload = getAuthFromRequest(req);
  if (!payload) {
    return ok(res, { user: null, profile: null, roles: [] });
  }

  const pool = await getPool();
  const [userResult, rolesResult] = await Promise.all([
    pool
      .request()
      .input("id", sql.UniqueIdentifier, payload.sub)
      .query("SELECT id, email, full_name, avatar_url FROM users WHERE id = @id"),
    pool
      .request()
      .input("user_id", sql.UniqueIdentifier, payload.sub)
      .query("SELECT role FROM user_roles WHERE user_id = @user_id"),
  ]);

  const user = userResult.recordset[0] as any;
  if (!user) return ok(res, { user: null, profile: null, roles: [] });

  const roles = (rolesResult.recordset as { role: string }[]).map((r) => r.role);
  return ok(res, {
    user: { id: user.id, email: user.email },
    profile: { full_name: user.full_name, avatar_url: user.avatar_url },
    roles,
  });
}

export default withErrorHandling(withMethods(["GET"], handler), { name: "auth.session" });
