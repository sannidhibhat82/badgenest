import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthFromRequest } from "../../../lib/auth";
import { getPool } from "../../../database/connection";
import sql from "mssql";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const payload = getAuthFromRequest(req);
  if (!payload) {
    return res.status(200).json({ user: null, profile: null, roles: [] });
  }

  try {
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

    const user = userResult.recordset[0];
    if (!user) {
      return res.status(200).json({ user: null, profile: null, roles: [] });
    }

    const roles = (rolesResult.recordset as { role: string }[]).map((r) => r.role);
    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
      },
      profile: {
        full_name: user.full_name,
        avatar_url: user.avatar_url,
      },
      roles,
    });
  } catch (err) {
    console.error("Session error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
