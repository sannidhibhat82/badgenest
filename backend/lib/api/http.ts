import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next";

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE" | "OPTIONS";

export type ApiErrorBody = { error: string; details?: unknown };

export function allow(res: NextApiResponse, methods: HttpMethod[]) {
  res.setHeader("Allow", methods.join(", "));
}

export function ok<T>(res: NextApiResponse, body: T, status = 200) {
  return res.status(status).json(body);
}

export function noContent(res: NextApiResponse) {
  return res.status(204).end();
}

export function badRequest(res: NextApiResponse, error: string, details?: unknown) {
  return res.status(400).json({ error, details } satisfies ApiErrorBody);
}

export function unauthorized(res: NextApiResponse, error = "Unauthorized") {
  return res.status(401).json({ error } satisfies ApiErrorBody);
}

export function forbidden(res: NextApiResponse, error = "Forbidden") {
  return res.status(403).json({ error } satisfies ApiErrorBody);
}

export function notFound(res: NextApiResponse, error = "Not found") {
  return res.status(404).json({ error } satisfies ApiErrorBody);
}

export function methodNotAllowed(res: NextApiResponse, methods: HttpMethod[]) {
  allow(res, methods);
  return res.status(405).json({ error: "Method not allowed" } satisfies ApiErrorBody);
}

export function serverError(res: NextApiResponse, error = "Internal server error") {
  return res.status(500).json({ error } satisfies ApiErrorBody);
}

export function withMethods(methods: HttpMethod[], handler: NextApiHandler): NextApiHandler {
  return async (req, res) => {
    if (!req.method || !methods.includes(req.method as HttpMethod)) {
      return methodNotAllowed(res, methods);
    }
    return handler(req, res);
  };
}

export function withErrorHandling(handler: NextApiHandler, context: { name: string }): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      return await handler(req, res);
    } catch (err) {
      // Avoid leaking internals to clients; log for ops/devs.
      console.error(`${context.name} error:`, err);
      return serverError(res);
    }
  };
}

