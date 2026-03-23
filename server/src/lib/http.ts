import type { Response } from "express";

export function ok<T>(res: Response, body: T, status = 200) {
  return res.status(status).json(body);
}

export function noContent(res: Response) {
  return res.status(204).end();
}

export function badRequest(res: Response, error: string, details?: unknown) {
  return res.status(400).json({ error, ...(details !== undefined ? { details } : {}) });
}

export function unauthorized(res: Response, error = "Unauthorized") {
  return res.status(401).json({ error });
}

export function forbidden(res: Response, error = "Forbidden") {
  return res.status(403).json({ error });
}

export function notFound(res: Response, error = "Not found") {
  return res.status(404).json({ error });
}

export function conflict(res: Response, error: string) {
  return res.status(409).json({ error });
}

export function tooMany(res: Response, retryAfterSec: number) {
  res.setHeader("Retry-After", String(retryAfterSec));
  return res.status(429).json({ error: "Too many requests" });
}

export function serverError(res: Response, error = "Internal server error") {
  return res.status(500).json({ error });
}

export function serviceUnavailable(res: Response, error: string) {
  return res.status(503).json({ error });
}
