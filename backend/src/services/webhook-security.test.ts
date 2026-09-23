import { describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";

vi.mock("../config/env.js", () => ({
  env: {
    NODE_ENV: "production",
    WHATSAPP_APP_SECRET: "test-app-secret",
    ALLOW_WEBHOOK_SIMULATE: false,
  },
}));

import { verifyWebhookSignature, isSimulateEndpointAllowed } from "./webhook-security.js";

describe("verifyWebhookSignature", () => {
  it("validates HMAC signature", () => {
    const body = Buffer.from('{"entry":[]}');
    const digest = crypto.createHmac("sha256", "test-app-secret").update(body).digest("hex");

    expect(verifyWebhookSignature(body, `sha256=${digest}`)).toBe(true);
    expect(verifyWebhookSignature(body, "sha256=invalid")).toBe(false);
  });
});

describe("isSimulateEndpointAllowed", () => {
  it("blocks simulate in production without override", () => {
    expect(isSimulateEndpointAllowed()).toBe(false);
  });
});
