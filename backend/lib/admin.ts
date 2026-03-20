import { NextApiRequest, NextApiResponse } from "next";
import { getAuthFromRequest } from "./auth";
import { getPool } from "../database/connection";
import sql from "mssql";
import { forbidden, unauthorized } from "./api/http";

export async function requireAdmin(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<{ userId: string } | null> {
  const payload = getAuthFromRequest(req);
  if (!payload) {
    unauthorized(res);
    return null;
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input("user_id", sql.UniqueIdentifier, payload.sub)
    .input("role", sql.NVarChar(50), "admin")
    .query("SELECT 1 FROM user_roles WHERE user_id = @user_id AND role = @role");

  if (!result.recordset.length) {
    forbidden(res, "Admin access required");
    return null;
  }
  return { userId: payload.sub };
}

export async function requireAuth(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<{ userId: string } | null> {
  const payload = getAuthFromRequest(req);
  if (!payload) {
    unauthorized(res);
    return null;
  }
  return { userId: payload.sub };
}
