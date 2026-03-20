import type { NextApiRequest, NextApiResponse } from "next";
import { badRequest } from "./http";

export function requireStringQuery(
  req: NextApiRequest,
  res: NextApiResponse,
  key: string
): string | null {
  const v = (req.query as Record<string, unknown>)[key];
  if (typeof v !== "string" || !v.trim()) {
    badRequest(res, `Invalid ${key}`);
    return null;
  }
  return v;
}

