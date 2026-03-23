import type { NextFunction, Request, Response } from "express";
import { logger } from "../config/logger.js";
import { serverError } from "../lib/http.js";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  logger.error("Unhandled error", err instanceof Error ? { message: err.message, stack: err.stack } : err);
  return serverError(res);
}
