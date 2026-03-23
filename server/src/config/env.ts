import path from "path";
import { z } from "zod";
import dotenv from "dotenv";

const cwd = process.cwd();
// `override: true` so values from `.env` win over stale variables inherited from the shell (e.g. truncated DATABASE_URL).
dotenv.config({ path: path.resolve(cwd, "../.env"), override: true });
dotenv.config({ path: path.resolve(cwd, ".env"), override: true });

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  FRONTEND_URL: z.string().url("FRONTEND_URL must be a valid URL"),
  BACKEND_URL: z.string().url("BACKEND_URL must be a valid URL"),
  ADMIN_BOOTSTRAP_SECRET: z.string().optional(),
  UPLOAD_DIR: z.string().optional(),
  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.coerce.number().int().positive().optional(),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  EMAIL_SECURE: z.enum(["true", "false"]).optional(),
});

export type AppEnv = z.infer<typeof EnvSchema> & { uploadDirAbs: string };

function loadEnv(): AppEnv {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    throw new Error(`Invalid environment: ${JSON.stringify(msg)}`);
  }
  const e = parsed.data;
  if (e.NODE_ENV === "production" && e.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters in production");
  }
  const uploadDirAbs = path.resolve(e.UPLOAD_DIR ?? path.join(cwd, "public", "uploads"));
  return { ...e, uploadDirAbs };
}

export const env = loadEnv();

export function isProd(): boolean {
  return env.NODE_ENV === "production";
}
