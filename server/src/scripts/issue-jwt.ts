/**
 * Issue a Bearer JWT using the same signing as the API (requires root `.env` with JWT_SECRET).
 *
 * By email (loads user from DB):
 *   npm run generate:jwt -- --email=user@example.com
 *   npm run generate:jwt -- --email=user@example.com --admin
 *
 * Offline (no DB; sub must be a real user id in your DB for role checks to pass):
 *   npm run generate:jwt -- --sub=<uuid> --email=user@example.com
 */
import "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { signToken } from "../lib/jwt.js";

function arg(long: string): string | undefined {
  const eq = `${long}=`;
  for (const a of process.argv) {
    if (a.startsWith(eq)) return a.slice(eq.length);
  }
  const i = process.argv.indexOf(long);
  if (i === -1 || !process.argv[i + 1] || process.argv[i + 1].startsWith("--")) return undefined;
  return process.argv[i + 1];
}

async function main() {
  const emailArg = arg("--email");
  const subArg = arg("--sub");
  const requireAdmin = process.argv.includes("--admin");

  if (!emailArg && !subArg) {
    console.error(
      "Usage:\n  npm run generate:jwt -- --email=user@example.com [--admin]\n  npm run generate:jwt -- --sub=<user-uuid> --email=user@example.com"
    );
    process.exit(1);
  }

  let userId: string;
  let email: string;

  if (emailArg && !subArg) {
    const norm = emailArg.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: norm },
      select: { id: true, email: true },
    });
    if (!user) {
      console.error("No user found with email:", norm);
      process.exit(1);
    }
    userId = user.id;
    email = user.email;

    if (requireAdmin) {
      const role = await prisma.userRole.findFirst({
        where: { userId: user.id, role: "admin" },
      });
      if (!role) {
        console.error("User exists but does not have admin role. Promote first (POST /api/admin/promote or npm run seed:admin).");
        process.exit(1);
      }
    }
  } else {
    if (!subArg || !emailArg) {
      console.error("Offline mode requires both --sub=<uuid> and --email=...");
      process.exit(1);
    }
    userId = subArg.trim();
    email = emailArg.trim().toLowerCase();
    if (requireAdmin) {
      console.warn("Warning: --admin ignored in offline mode (role not checked). Use --email lookup for a verified admin token.");
    }
  }

  const token = signToken(userId, email);
  console.log("\n# Valid 7 days. Use as: Authorization: Bearer <token>\n");
  console.log(token);
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
