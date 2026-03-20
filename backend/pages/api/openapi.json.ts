import type { NextApiRequest, NextApiResponse } from "next";
import { buildOpenApiSpec } from "../../lib/openapi/spec";

function getBaseUrl(req: NextApiRequest) {
  const host =
    (req.headers["x-forwarded-host"] as string | undefined) || req.headers.host || "localhost:3001";

  // In local dev we almost always serve over plain HTTP.
  const isLocal =
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("[::1]");

  const proto =
    !isLocal && (req.headers["x-forwarded-proto"] as string | undefined)
      ? (req.headers["x-forwarded-proto"] as string)
      : (isLocal ? "http" : (req.socket as any)?.encrypted ? "https" : "http");

  return `${proto}://${host}`;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Allow Swagger UI (and other tools) to fetch this spec even if embedded elsewhere.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const baseUrl = getBaseUrl(req);
  const spec = buildOpenApiSpec(baseUrl);

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  // Helpful when running behind Vite dev server or reverse proxies
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json(spec);
}

