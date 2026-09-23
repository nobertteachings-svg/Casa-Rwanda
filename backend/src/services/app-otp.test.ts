import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  canonicalPhone,
  consumeLoginOtp,
  isAppLoginTrigger,
  isPendingOtpFollowup,
  otpForInboundWhatsApp,
  peekLoginOtp,
  phoneAliases,
  storeLoginOtp,
} from "./app-otp.js";

const store = new Map<string, string>();

vi.mock("../redis/client.js", () => ({
  redis: {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
      return "OK";
    }),
    del: vi.fn(async (...keys: string[]) => {
      for (const key of keys) store.delete(key);
    }),
    multi() {
      return {
        set: (key: string, value: string) => {
          store.set(key, value);
          return this;
        },
        del: (key: string) => {
          store.delete(key);
          return this;
        },
        exec: async () => [],
      };
    },
    zadd: vi.fn(),
    zremrangebyscore: vi.fn(),
    expire: vi.fn(),
    zrangebyscore: vi.fn(async () => []),
  },
}));

describe("canonicalPhone", () => {
  it("adds 250 to local Rwandan mobiles", () => {
    expect(canonicalPhone("788123456")).toBe("250788123456");
    expect(canonicalPhone("0788123456")).toBe("250788123456");
    expect(canonicalPhone("+250 788 123 456")).toBe("250788123456");
    expect(canonicalPhone("250788123456")).toBe("250788123456");
  });
});

describe("phoneAliases", () => {
  it("includes local and international forms", () => {
    const aliases = phoneAliases("0788123456");
    expect(aliases).toContain("250788123456");
    expect(aliases).toContain("788123456");
    expect(aliases).toContain("0788123456");
  });
});

describe("isAppLoginTrigger", () => {
  it("matches the app prefill", () => {
    expect(isAppLoginTrigger("CASA-APP-LOGIN\nSend this message to get your Casa login code.")).toBe(
      true
    );
  });

  it("matches french prefill", () => {
    expect(isAppLoginTrigger("CASA-APP-LOGIN\nEnvoyez ce message pour recevoir votre code Casa.")).toBe(
      true
    );
  });

  it("ignores normal chat", () => {
    expect(isAppLoginTrigger("hi")).toBe(false);
    expect(isAppLoginTrigger("I need a 2 bedroom in Kimironko")).toBe(false);
  });
});

describe("isPendingOtpFollowup", () => {
  it("matches the current store-app WhatsApp link", () => {
    expect(isPendingOtpFollowup("Hi Casa! I want to sign up.")).toBe(true);
    expect(isPendingOtpFollowup("hi")).toBe(true);
  });

  it("ignores listing search", () => {
    expect(isPendingOtpFollowup("I need a 2 bedroom in Kimironko")).toBe(false);
  });
});

describe("store and consume login OTP", () => {
  beforeEach(() => {
    store.clear();
  });

  it("accepts the same code from 0788 and 250788 forms", async () => {
    await storeLoginOtp("0788123456", "847291");
    expect(await peekLoginOtp("250788123456")).toBe("847291");
    const consumed = await consumeLoginOtp("788123456", "847291");
    expect(consumed).toEqual({ status: "ok", phone: "250788123456" });
  });

  it("accepts a code even if the typed phone does not match the stored one", async () => {
    await storeLoginOtp("250788123456", "112233");
    const consumed = await consumeLoginOtp("250790000000", "112233");
    expect(consumed.status).toBe("ok");
    expect(consumed.phone).toBe("250788123456");
  });

  it("reuses the stored code when WhatsApp asks for login", async () => {
    await storeLoginOtp("0788123456", "555666");
    await expect(otpForInboundWhatsApp("250788123456")).resolves.toBe("555666");
  });
});
