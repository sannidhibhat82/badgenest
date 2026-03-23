import type { Response } from "express";
import { ZodError, type ZodSchema } from "zod";
import { badRequest } from "./http.js";

export function parseJson<T>(schema: ZodSchema<T>, value: unknown, res: Response): T | null {
  try {
    return schema.parse(value);
  } catch (err) {
    if (err instanceof ZodError) {
      badRequest(res, "Validation error", err.flatten());
      return null;
    }
    throw err;
  }
}
