import type { NextFunction, Request, Response } from "express";
import { tooMany } from "../lib/http.js";

type Entry = { count: number; resetAtMs: number };
const store = new Map<string, Entry>();

function clientKey(req: Request): string {
  const xf = req.headers["x-forwarded-for"];
  const ip = Array.isArray(xf) ? xf[0] : xf?.split(",")[0]?.trim();
  return ip || req.socket.remoteAddress || "unknown";
}

export function rateLimit(options: { windowMs: number; max: number; keyPrefix?: string }) {
  const { windowMs, max, keyPrefix = "rl" } = options;
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${keyPrefix}:${req.method}:${req.path}:${clientKey(req)}`;
    const entry = store.get(key);

    if (!entry || now >= entry.resetAtMs) {
      store.set(key, { count: 1, resetAtMs: now + windowMs });
    } else {
      entry.count += 1;
      store.set(key, entry);
      if (entry.count > max) {
        return tooMany(res, Math.ceil((entry.resetAtMs - now) / 1000));
      }
    }
    next();
  };
}
