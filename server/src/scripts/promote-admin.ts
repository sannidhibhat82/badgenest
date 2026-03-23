/**
 * Promote a user to admin by email (uses DATABASE_URL from env).
 * Usage: npm run seed:admin -- user@example.com
 */
import { v4 as uuidv4 } from "uuid";
import "../config/env.js";
import { prisma } from "../lib/prisma.js";

const emailArg = process.argv[2]?.trim().toLowerCase();
if (!emailArg) {
  console.error("Usage: npm run seed:admin -- <email>");
  process.exit(1);
}

async function run() {
  const user = await prisma.user.findUnique({ where: { email: emailArg } });
  if (!user) {
    console.error("User not found:", emailArg);
    process.exit(1);
  }
  const existing = await prisma.userRole.findFirst({
    where: { userId: user.id, role: "admin" },
  });
  if (existing) {
    console.log("User is already an admin:", emailArg);
    return;
  }
  await prisma.userRole.create({
    data: { id: uuidv4(), userId: user.id, role: "admin" },
  });
  console.log("Promoted to admin:", emailArg);
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
