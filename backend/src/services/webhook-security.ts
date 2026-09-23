import crypto from "node:crypto";
import { env } from "../config/env.js";

export function verifyWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined
): boolean {
  const secret = env.WHATSAPP_APP_SECRET;
  if (!secret) {
    if (env.NODE_ENV === "production") {
      console.error("WHATSAPP_APP_SECRET is required in production");
      return false;
    }
    return true;
  }

  if (!signatureHeader?.startsWith("sha256=")) return false;

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = signatureHeader.slice(7);
  if (expected.length !== received.length) return false;

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

export function isSimulateEndpointAllowed(): boolean {
  if (env.ALLOW_WEBHOOK_SIMULATE) return true;
  return env.NODE_ENV !== "production";
}
