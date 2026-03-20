import type { NextApiResponse } from "next";
import { ZodError, type ZodSchema } from "zod";
import { badRequest } from "./http";

export function parseJson<T>(schema: ZodSchema<T>, value: unknown, res: NextApiResponse): T | null {
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

