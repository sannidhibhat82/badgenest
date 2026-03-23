import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { logger } from "./config/logger.js";
import { prisma } from "./lib/prisma.js";

async function main() {
  await prisma.$connect();
  logger.info("Database connection OK");

  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info(`API listening on port ${env.PORT}`, { backendUrl: env.BACKEND_URL });
  });
}

main().catch((err) => {
  logger.error("Server failed to start", err);
  process.exit(1);
});
