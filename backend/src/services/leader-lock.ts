import { redis } from "../redis/client.js";

/** Run fn only on one replica (safe for scheduled jobs across multiple workers). */
export async function withLeaderLock(
  lockName: string,
  ttlSec: number,
  fn: () => Promise<void>
): Promise<void> {
  if (redis.status !== "ready") {
    await fn();
    return;
  }

  const token = `${process.pid}-${Date.now()}`;
  const key = `casa:leader:${lockName}`;
  const acquired = await redis.set(key, token, "EX", ttlSec, "NX");
  if (acquired !== "OK") return;

  try {
    await fn();
  } finally {
    const current = await redis.get(key);
    if (current === token) {
      await redis.del(key);
    }
  }
}
