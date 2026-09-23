import { redis } from "./redis/client.js";
import { logger } from "./lib/logger.js";
import { startScheduledJobs } from "./services/features/scheduler.js";
import {
  recoverOrphanedWebhookJobs,
  startWebhookWorker,
} from "./services/webhook-queue.js";

export async function connectRedis(): Promise<void> {
  await Promise.race([
    redis.connect(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Redis connect timeout")), 8_000)
    ),
  ]).catch((err) => {
    logger.warn("Redis not connected — conversation state will fail", { err: String(err) });
  });
}

/** Always consume the webhook queue (safe on multiple web replicas via message claim). */
export function startWebhookConsumers(): void {
  void recoverOrphanedWebhookJobs();
  startWebhookWorker();
  logger.info("Webhook queue worker started");
}

/** Scheduled jobs only — use on worker/all roles (leader-locked in Redis). */
export function startScheduledWorkers(): void {
  startScheduledJobs();
  logger.info("Scheduled jobs registered");
}

/** @deprecated Prefer startWebhookConsumers + startScheduledWorkers */
export function startBackgroundWorkers(): void {
  startWebhookConsumers();
  startScheduledWorkers();
}
