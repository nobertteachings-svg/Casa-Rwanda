import { describe, expect, it } from "vitest";
import {
  houseStatusBodySchema,
  publicListingsQuerySchema,
  simulateWebhookBodySchema,
  unlockFeeBodySchema,
  ussdBodySchema,
} from "./http.js";

describe("HTTP schemas (correctness)", () => {
  it("accepts valid house status", () => {
    expect(houseStatusBodySchema.parse({ status: "active" }).status).toBe("active");
  });

  it("rejects invalid house status", () => {
    expect(() => houseStatusBodySchema.parse({ status: "deleted" })).toThrow();
  });

  it("caps public listings limit", () => {
    expect(() => publicListingsQuerySchema.parse({ limit: "100" })).toThrow();
    expect(publicListingsQuerySchema.parse({ limit: "12" }).limit).toBe(12);
  });

  it("requires phone for webhook simulate", () => {
    expect(simulateWebhookBodySchema.safeParse({ text: "hi" }).success).toBe(false);
    expect(simulateWebhookBodySchema.safeParse({ phone: "2508000000001" }).success).toBe(true);
  });

  it("requires unlock fee >= 500", () => {
    expect(unlockFeeBodySchema.safeParse({ unlockFeeRwf: 100 }).success).toBe(false);
    expect(unlockFeeBodySchema.safeParse({ unlockFeeRwf: 15000 }).success).toBe(true);
  });

  it("requires USSD sessionId and phoneNumber", () => {
    expect(ussdBodySchema.safeParse({}).success).toBe(false);
    expect(
      ussdBodySchema.safeParse({ sessionId: "s1", phoneNumber: "2508000000001" }).success
    ).toBe(true);
  });
});
