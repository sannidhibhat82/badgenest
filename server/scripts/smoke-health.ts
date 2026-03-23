/**
 * One-off: start app on ephemeral port, GET /health, exit (no Prisma).
 * Run from repo root:  npx tsx server/scripts/smoke-health.ts
 * Or from server/:      npx tsx scripts/smoke-health.ts
 */
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
dotenv.config({ path: path.join(root, ".env"), override: true });
dotenv.config({ path: path.join(__dirname, "..", ".env"), override: true });

process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "sqlserver://localhost:1433;database=badgenest;user=sa;password=placeholder;encrypt=true;trustServerCertificate=true";
process.env.JWT_SECRET = process.env.JWT_SECRET || "dev-secret-at-least-32-chars-long!!";
process.env.FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:8080";
process.env.BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

const { createApp } = await import("../src/app.js");
const app = createApp();
const server = app.listen(0, async () => {
  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  const r = await fetch(`http://127.0.0.1:${port}/health`);
  const body = await r.json();
  console.log("smoke-health:", r.status, body);
  if (!r.ok || body.ok !== true) {
    process.exitCode = 1;
  }
  server.close();
});
