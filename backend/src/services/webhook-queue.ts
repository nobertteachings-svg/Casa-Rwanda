import { redis } from "../redis/client.js";
import { routeMessage } from "../flows/router.js";
import type { IncomingMessage } from "./whatsapp.js";
import { logger } from "../lib/logger.js";
import { captureError } from "../monitoring.js";

const QUEUE_KEY = "casa:webhook:queue";
const PROCESSING_KEY = "casa:webhook:processing";
const DLQ_KEY = "casa:webhook:dlq";
const SEEN_PREFIX = "casa:webhook:seen:";
const SEEN_TTL_SEC = 86_400;
const MAX_ATTEMPTS = 3;

type QueuedMessage = IncomingMessage & { _attempts?: number };

export async function tryClaimWebhookMessage(messageId: string): Promise<boolean> {
  if (!messageId || messageId.startsWith("sim-")) return true;
  if (redis.status !== "ready") return true;

  const result = await redis.set(`${SEEN_PREFIX}${messageId}`, "1", "EX", SEEN_TTL_SEC, "NX");
  return result === "OK";
}

export async function enqueueWebhookMessages(messages: IncomingMessage[]): Promise<void> {
  if (messages.length === 0) return;

  if (redis.status !== "ready") {
    for (const message of messages) {
      if (!(await tryClaimWebhookMessage(message.id))) continue;
      await routeMessage(message).catch((err) => {
        logger.error("Webhook routeMessage failed (no Redis)", {
          from: message.from,
          messageId: message.id,
          err: String(err),
        });
        captureError(err, { from: message.from, messageId: message.id });
      });
    }
    return;
  }

  const pipeline = redis.pipeline();
  for (const message of messages) {
    const payload: QueuedMessage = { ...message, _attempts: 0 };
    pipeline.rpush(QUEUE_KEY, JSON.stringify(payload));
  }
  await pipeline.exec();
}

async function requeueOrDeadLetter(raw: string, message: QueuedMessage, err: unknown): Promise<void> {
  const attempts = (message._attempts ?? 0) + 1;
  captureError(err, { from: message.from, messageId: message.id, attempts });

  if (attempts >= MAX_ATTEMPTS) {
    logger.error("Webhook message moved to DLQ", {
      from: message.from,
      messageId: message.id,
      attempts,
      err: String(err),
    });
    await redis.rpush(
      DLQ_KEY,
      JSON.stringify({ ...message, _attempts: attempts, _failedAt: new Date().toISOString(), _error: String(err) })
    );
    // Allow a future identical Meta delivery to be claimed again after TTL if needed
    if (message.id) {
      await redis.del(`${SEEN_PREFIX}${message.id}`);
    }
    return;
  }

  logger.warn("Webhook message requeued", {
    from: message.from,
    messageId: message.id,
    attempts,
  });
  await redis.rpush(QUEUE_KEY, JSON.stringify({ ...message, _attempts: attempts }));
}

async function processOne(raw: string): Promise<void> {
  let message: QueuedMessage;
  try {
    message = JSON.parse(raw) as QueuedMessage;
  } catch (err) {
    logger.error("Webhook queue invalid JSON — discarding", { err: String(err) });
    return;
  }

  try {
    if (!(await tryClaimWebhookMessage(message.id))) return;
    await routeMessage(message);
  } catch (err) {
    logger.error("Webhook worker failed", {
      from: message.from,
      messageId: message.id,
      err: String(err),
    });
    await requeueOrDeadLetter(raw, message, err);
  }
}

let workerRunning = false;

export function startWebhookWorker(): void {
  if (workerRunning) return;
  workerRunning = true;

  const tick = async () => {
    if (redis.status !== "ready") return;

    try {
      for (let i = 0; i < 20; i++) {
        // Move to a processing list first so a crash mid-handler can be recovered
        const raw = await redis.rpoplpush(QUEUE_KEY, PROCESSING_KEY);
        if (!raw) break;

        try {
          await processOne(raw);
        } finally {
          await redis.lrem(PROCESSING_KEY, 1, raw);
        }
      }
    } catch (err) {
      logger.error("Webhook worker tick error", { err: String(err) });
      captureError(err, { component: "webhook-worker" });
    }
  };

  setInterval(tick, 200);
  void tick();
}

/** Re-enqueue orphaned items left in processing after a process crash. */
export async function recoverOrphanedWebhookJobs(): Promise<number> {
  if (redis.status !== "ready") return 0;
  let recovered = 0;
  while (true) {
    const raw = await redis.rpoplpush(PROCESSING_KEY, QUEUE_KEY);
    if (!raw) break;
    recovered += 1;
    if (recovered > 500) break;
  }
  if (recovered > 0) {
    logger.info("Recovered orphaned webhook jobs", { recovered });
  }
  return recovered;
}

export async function getWebhookQueueDepths(): Promise<{
  queued: number;
  processing: number;
  dlq: number;
}> {
  if (redis.status !== "ready") {
    return { queued: 0, processing: 0, dlq: 0 };
  }
  const [queued, processing, dlq] = await Promise.all([
    redis.llen(QUEUE_KEY),
    redis.llen(PROCESSING_KEY),
    redis.llen(DLQ_KEY),
  ]);
  return { queued, processing, dlq };
}
