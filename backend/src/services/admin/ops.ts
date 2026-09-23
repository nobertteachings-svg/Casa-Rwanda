import { redis } from "../../redis/client.js";

const LAST_WEBHOOK_KEY = "ops:last_webhook";
const MSG_24H_KEY = "ops:messages_24h";
const AI_FAIL_KEY = "ops:ai_failures_24h";

export async function recordWebhookMessages(count: number): Promise<void> {
  try {
    await redis.set(LAST_WEBHOOK_KEY, String(Date.now()));
    if (count > 0) {
      await redis.incrby(MSG_24H_KEY, count);
      await redis.expire(MSG_24H_KEY, 86_400);
    }
  } catch {
    /* redis optional for ops */
  }
}

export async function recordAiFailure(): Promise<void> {
  try {
    await redis.incr(AI_FAIL_KEY);
    await redis.expire(AI_FAIL_KEY, 86_400);
  } catch {
    /* ignore */
  }
}

export async function getOpsMetrics(): Promise<{
  lastWebhookAt: string | null;
  messagesLast24h: number;
  aiFailuresLast24h: number;
}> {
  try {
    const [last, msgs, fails] = await Promise.all([
      redis.get(LAST_WEBHOOK_KEY),
      redis.get(MSG_24H_KEY),
      redis.get(AI_FAIL_KEY),
    ]);
    return {
      lastWebhookAt: last ? new Date(parseInt(last, 10)).toISOString() : null,
      messagesLast24h: parseInt(msgs ?? "0", 10),
      aiFailuresLast24h: parseInt(fails ?? "0", 10),
    };
  } catch {
    return { lastWebhookAt: null, messagesLast24h: 0, aiFailuresLast24h: 0 };
  }
}
