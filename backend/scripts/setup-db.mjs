/**
 * Create BadgeNest database and run schema (local MSSQL).
 * Requires: SQL Server running and backend/.env with DB_* set.
 * Run from backend: npm run db:setup
 */
import sql from "mssql";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load backend/.env
config({ path: join(__dirname, "..", ".env") });

const baseConfig = {
  user: process.env.DB_USER || "sa",
  password: process.env.DB_PASSWORD || "",
  server: process.env.DB_SERVER || "localhost",
  port: parseInt(process.env.DB_PORT || "1433", 10),
  options: {
    encrypt: process.env.DB_ENCRYPT === "true",
    trustServerCertificate: true,
    enableArithAbort: true,
  },
};

async function run() {
  console.log("Connecting to SQL Server at", baseConfig.server + ":" + baseConfig.port, "...");
  let pool = await sql.connect({ ...baseConfig, database: "master" });

  const dbName = process.env.DB_DATABASE || "badgenest";
  console.log("Creating database", dbName, "if not exists...");
  await pool.request().query(`
    IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = '${dbName.replace(/'/g, "''")}')
    CREATE DATABASE [${dbName.replace(/\]/g, "]]")}];
  `);
  await pool.close();

  console.log("Connecting to database", dbName, "...");
  pool = await sql.connect({ ...baseConfig, database: dbName });

  const schemaPath = join(__dirname, "..", "database", "schema.sql");
  const schemaSql = readFileSync(schemaPath, "utf8");
  // Split by GO (batch separator) if present; otherwise run as single batch
  const batches = schemaSql
    .split(/\bGO\b/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    if (batch) {
      console.log("Running schema batch", i + 1, "of", batches.length);
      await pool.request().query(batch);
    }
  }

  await pool.close();
  console.log("Database setup complete.");
}

run().catch((err) => {
  console.error("Setup failed:", err?.message || err);
  if (err && typeof err === "object") {
    // mssql errors often carry useful nested info
    const details = {
      code: err.code,
      number: err.number,
      state: err.state,
      class: err.class,
      serverName: err.serverName,
      procName: err.procName,
      lineNumber: err.lineNumber,
      originalError: err.originalError?.message,
      precedingErrors: Array.isArray(err.precedingErrors)
        ? err.precedingErrors.map((e) => ({ message: e?.message, code: e?.code, number: e?.number }))
        : undefined,
    };
    console.error("Error details:", JSON.stringify(details, null, 2));
  }
  process.exit(1);
});
