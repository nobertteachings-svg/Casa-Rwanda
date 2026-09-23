import cors from "cors";
import express, { json, type NextFunction, type Request, type Response } from "express";
import { env, isWhatsAppConfigured } from "./config/env.js";
import { pool } from "./db/pool.js";
import { logger } from "./lib/logger.js";
import { createRateLimiter } from "./middleware/rate-limit.js";
import { securityHeaders } from "./middleware/security-headers.js";
import { redis } from "./redis/client.js";
import { adminRouter } from "./routes/admin.js";
import { appRouter } from "./routes/app.js";
import { legalRouter } from "./routes/legal.js";
import { publicRouter } from "./routes/public.js";
import { ussdRouter } from "./routes/ussd.js";
import { webhookRouter } from "./routes/webhook.js";
import { getWebhookQueueDepths } from "./services/webhook-queue.js";
import { captureError } from "./monitoring.js";

const webhookJson = json({
  verify: (req: Request, _res, buf) => {
    req.rawBody = buf;
  },
});

const webhookRateLimit = createRateLimiter({
  prefix: "webhook",
  limit: 120,
  windowSec: 60,
  failClosed: true,
});

const ussdRateLimit = createRateLimiter({
  prefix: "ussd",
  limit: 30,
  windowSec: 60,
  failClosed: true,
});

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(securityHeaders);

  const normalizeOrigin = (origin: string) => origin.replace(/\/$/, "");

  const adminOrigins = [
    ...env.ADMIN_ORIGIN.split(",")
      .map((o) => normalizeOrigin(o.trim()))
      .filter(Boolean),
    ...env.MARKETING_ORIGIN.split(",")
      .map((o) => normalizeOrigin(o.trim()))
      .filter(Boolean),
    "http://localhost:5173",
    "http://localhost:5174",
  ];

  function isAllowedAdminOrigin(origin: string | undefined): boolean {
    if (!origin) return true;
    const normalized = normalizeOrigin(origin);
    if (adminOrigins.includes(normalized)) return true;
    try {
      return new URL(origin).hostname.endsWith(".up.railway.app");
    } catch {
      return false;
    }
  }

  app.use(
    cors({
      origin(origin, callback) {
        callback(null, isAllowedAdminOrigin(origin));
      },
      credentials: true,
    })
  );

  app.use("/webhook", webhookRateLimit, webhookJson, webhookRouter);
  app.use(json({ limit: "1mb" }));

  app.get("/health", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      let redisOk = false;
      if (redis.status === "ready") {
        redisOk = await Promise.race([
          redis.ping().then(() => true),
          new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 3_000)),
        ]);
      }

      const queue = redisOk ? await getWebhookQueueDepths() : null;
      // Postgres is critical; Redis outage marks degraded but keeps the process discoverable
      const status = redisOk ? "ok" : "degraded";
      const httpStatus = redisOk ? 200 : 200;

      res.status(httpStatus).json({
        status,
        postgres: true,
        redis: redisOk,
        whatsapp: isWhatsAppConfigured,
        whatsapp_config: {
          has_token: Boolean(env.WHATSAPP_TOKEN?.trim()),
          has_phone_number_id: Boolean(env.WHATSAPP_PHONE_NUMBER_ID?.trim()),
          has_app_secret: Boolean(env.WHATSAPP_APP_SECRET?.trim()),
          has_verify_token: Boolean(env.WHATSAPP_VERIFY_TOKEN?.trim()),
          token_length: env.WHATSAPP_TOKEN?.trim().length ?? 0,
          phone_number_id_length: env.WHATSAPP_PHONE_NUMBER_ID?.trim().length ?? 0,
          commit: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? "unknown",
        },
        queue,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      logger.error("Health check failed", { err: String(err) });
      res.status(503).json({ status: "error", postgres: false, message: String(err) });
    }
  });

  app.use("/api/admin", adminRouter);
  app.use("/api/app", appRouter);
  app.use("/api/public", publicRouter);
  app.use("/ussd", ussdRateLimit, ussdRouter);
  app.use(legalRouter);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    logger.error("Unhandled Express error", { err: String(err) });
    captureError(err, { component: "express" });
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return app;
}
