import { initMonitoring, Sentry } from "./monitoring.js";
import { env, isWhatsAppConfigured } from "./config/env.js";
import { createApp } from "./app.js";
import { logger } from "./lib/logger.js";
import {
  connectRedis,
  startScheduledWorkers,
  startWebhookConsumers,
} from "./background.js";

initMonitoring();

const app = createApp();

async function start() {
  await connectRedis();

  const role = env.PROCESS_ROLE;

  // Always consume the webhook queue so replies work even when PROCESS_ROLE=web
  // and no separate worker service is deployed (message claim prevents duplicates).
  startWebhookConsumers();

  if (role === "worker") {
    startScheduledWorkers();
    logger.info("Casa worker-only mode started", { role });
    return;
  }

  // Scheduled jobs on all-in-one; skip on web-only (use a worker service for those).
  if (role !== "web") {
    startScheduledWorkers();
  }

  app.listen(env.PORT, "0.0.0.0", () => {
    const tokenLen = env.WHATSAPP_TOKEN?.trim().length ?? 0;
    const phoneLen = env.WHATSAPP_PHONE_NUMBER_ID?.trim().length ?? 0;
    // Plain string so Railway UI shows it without expanding JSON fields
    console.log(
      `Casa backend listening port=${env.PORT} whatsapp=${isWhatsAppConfigured} token_len=${tokenLen} phone_len=${phoneLen} commit=${process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? "unknown"}`
    );
    logger.info("Casa backend listening", {
      port: env.PORT,
      role,
      whatsapp: isWhatsAppConfigured,
      token_len: tokenLen,
      phone_len: phoneLen,
    });
  });
}

start().catch((err) => {
  logger.error("Failed to start", { err: String(err) });
  Sentry.captureException(err);
  process.exit(1);
});
