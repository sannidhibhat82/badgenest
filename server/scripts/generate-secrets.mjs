#!/usr/bin/env node
/**
 * Print cryptographically random values for .env (no DB required).
 *
 *   node scripts/generate-secrets.mjs
 *   node scripts/generate-secrets.mjs --jwt-only
 */
import crypto from "crypto";

const jwtOnly = process.argv.includes("--jwt-only");

function line(name, value) {
  console.log(`${name}=${value}`);
}

const jwtSecret = crypto.randomBytes(48).toString("base64url");
if (jwtOnly) {
  line("JWT_SECRET", jwtSecret);
  process.exit(0);
}

const bootstrap = crypto.randomBytes(32).toString("hex");

console.log("# Add these to your root .env (or server/.env)\n");
line("JWT_SECRET", jwtSecret);
line("ADMIN_BOOTSTRAP_SECRET", bootstrap);
console.log("\n# JWT_SECRET is 48 bytes base64url (~64 chars), safe for production.");
console.log("# Use ADMIN_BOOTSTRAP_SECRET with header x-bootstrap-secret for POST /api/admin/promote when no admin exists.");
