import type { Request, Response, NextFunction } from "express";
import { redis } from "../redis/client.js";
import { logger } from "../lib/logger.js";

export function createRateLimiter(options: {
  prefix: string;
  limit: number;
  windowSec: number;
  keyFn?: (req: Request) => string;
  /** When true, reject with 503 if Redis is unavailable (prefer for auth/webhook). */
  failClosed?: boolean;
}) {
  const { prefix, limit, windowSec, keyFn, failClosed = false } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const identity = keyFn?.(req) ?? req.ip ?? req.socket.remoteAddress ?? "unknown";
    const key = `casa:rl:${prefix}:${identity}`;

    try {
      if (redis.status !== "ready") {
        if (failClosed) {
          res.status(503).json({ error: "Service temporarily unavailable. Please try again." });
          return;
        }
        next();
        return;
      }

      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, windowSec);
      }

      if (count > limit) {
        res.status(429).json({ error: "Too many requests. Please try again shortly." });
        return;
      }

      next();
    } catch (err) {
      logger.warn("Rate limit check failed", { prefix, err: String(err) });
      if (failClosed) {
        res.status(503).json({ error: "Service temporarily unavailable. Please try again." });
        return;
      }
      next();
    }
  };
}
