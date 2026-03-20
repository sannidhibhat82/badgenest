import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next";

type Entry = { count: number; resetAtMs: number };
const store = new Map<string, Entry>();

function getClientKey(req: NextApiRequest): string {
  const xf = req.headers["x-forwarded-for"];
  const ip = Array.isArray(xf) ? xf[0] : xf?.split(",")[0]?.trim();
  return ip || req.socket.remoteAddress || "unknown";
}

export function withRateLimit(options: {
  windowMs: number;
  max: number;
  keyPrefix?: string;
}): (handler: NextApiHandler) => NextApiHandler {
  const { windowMs, max, keyPrefix = "rl" } = options;

  return (handler) =>
    async (req: NextApiRequest, res: NextApiResponse) => {
      const now = Date.now();
      const key = `${keyPrefix}:${req.method}:${req.url}:${getClientKey(req)}`;
      const entry = store.get(key);

      if (!entry || now >= entry.resetAtMs) {
        store.set(key, { count: 1, resetAtMs: now + windowMs });
      } else {
        entry.count += 1;
        store.set(key, entry);
        if (entry.count > max) {
          res.setHeader("Retry-After", Math.ceil((entry.resetAtMs - now) / 1000));
          return res.status(429).json({ error: "Too many requests" });
        }
      }

      return handler(req, res);
    };
}

