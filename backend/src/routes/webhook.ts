import { Router } from "express";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { validate } from "../middleware/validate.js";
import { simulateWebhookBodySchema } from "../schemas/http.js";
import { parseWebhookPayload } from "../services/whatsapp.js";
import { recordWebhookMessages } from "../services/admin/ops.js";
import {
  isSimulateEndpointAllowed,
  verifyWebhookSignature,
} from "../services/webhook-security.js";
import { enqueueWebhookMessages } from "../services/webhook-queue.js";
import { routeMessage } from "../flows/router.js";
import { captureError } from "../monitoring.js";

export const webhookRouter = Router();

webhookRouter.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === env.WHATSAPP_VERIFY_TOKEN) {
    logger.info("WhatsApp webhook verified");
    res.status(200).send(challenge);
    return;
  }

  res.sendStatus(403);
});

webhookRouter.post("/", async (req, res) => {
  const signature = req.headers["x-hub-signature-256"] as string | undefined;
  const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));

  if (!verifyWebhookSignature(rawBody, signature)) {
    logger.warn("Webhook signature verification failed");
    res.sendStatus(403);
    return;
  }

  res.sendStatus(200);

  try {
    const messages = parseWebhookPayload(req.body);
    if (messages.length > 0) {
      logger.info("Webhook messages received", {
        count: messages.length,
        from: messages.map((m) => `${m.from}:${m.type}`),
      });
    }
    await recordWebhookMessages(messages.length);
    await enqueueWebhookMessages(messages);
  } catch (err) {
    logger.error("Webhook processing error", { err: String(err) });
    captureError(err, { component: "webhook" });
  }
});

webhookRouter.post("/simulate", validate(simulateWebhookBodySchema), async (req, res) => {
  if (!isSimulateEndpointAllowed()) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const { phone, text, latitude, longitude } = req.body as {
    phone: string;
    text?: string;
    latitude?: number;
    longitude?: number;
  };

  res.status(202).json({ ok: true, status: "processing" });

  routeMessage({
    from: phone,
    id: `sim-${Date.now()}`,
    timestamp: String(Date.now()),
    type: latitude !== undefined ? "location" : "text",
    text,
    latitude,
    longitude,
  }).catch((err) => {
    logger.error("Simulate error", { err: String(err), phone });
    captureError(err, { component: "simulate", phone });
  });
});
