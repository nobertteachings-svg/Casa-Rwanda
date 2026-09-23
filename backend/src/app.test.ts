import { describe, expect, it, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("./db/pool.js", () => ({
  pool: {
    query: vi.fn().mockResolvedValue({ rows: [{ "?column?": 1 }] }),
  },
  query: vi.fn().mockResolvedValue({ rows: [] }),
}));

vi.mock("./redis/client.js", () => ({
  redis: {
    status: "ready",
    ping: vi.fn().mockResolvedValue("PONG"),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    connect: vi.fn().mockResolvedValue(undefined),
    get: vi.fn(),
    getBuffer: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
    rpush: vi.fn(),
    lpop: vi.fn(),
    llen: vi.fn().mockResolvedValue(0),
    lrem: vi.fn().mockResolvedValue(0),
    rpoplpush: vi.fn().mockResolvedValue(null),
    pipeline: vi.fn(() => ({ exec: vi.fn().mockResolvedValue([]) })),
  },
  getSession: vi.fn().mockResolvedValue(null),
  setSession: vi.fn().mockResolvedValue(undefined),
  deleteSession: vi.fn(),
}));

vi.mock("./flows/router.js", () => ({
  routeMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./services/admin-stats.js", () => ({
  getDashboardStats: vi.fn().mockResolvedValue({
    users: { total: 0, landlords: 0, tenants: 0, newToday: 0, newThisWeek: 0 },
    listings: {
      total: 0,
      active: 0,
      flagged: 0,
      underReview: 0,
      inactive: 0,
      newToday: 0,
    },
    revenue: {
      totalUnlocks: 0,
      totalEarningsRwf: 0,
      unlocksToday: 0,
      earningsTodayRwf: 0,
      unlocksThisMonth: 0,
      earningsThisMonthRwf: 0,
      unlockFeeRwf: 5000,
    },
    moderation: { pendingReviews: 0 },
    topNeighbourhoods: [],
    recentUnlocks: [],
  }),
  listUsers: vi.fn().mockResolvedValue({ users: [], total: 0 }),
  listHouses: vi.fn().mockResolvedValue({ houses: [], total: 0 }),
  listReviews: vi.fn().mockResolvedValue({ reviews: [], total: 0 }),
}));

import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { redis } from "./redis/client.js";

describe("HTTP API", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /health", () => {
    it("returns ok when database and redis respond", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
      expect(res.body).toHaveProperty("whatsapp");
      expect(res.body).toHaveProperty("timestamp");
      expect(res.body).toHaveProperty("postgres", true);
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
    });
  });

  describe("request validation", () => {
    it("rejects invalid public listings limit", async () => {
      const res = await request(app).get("/api/public/listings").query({ limit: 999 });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeTruthy();
    });

    it("rejects invalid house status body", async () => {
      const res = await request(app)
        .patch("/api/admin/houses/abc/status")
        .set("Authorization", `Bearer ${env.ADMIN_API_KEY}`)
        .send({ status: "not-a-status" });
      expect(res.status).toBe(400);
    });
  });

  describe("WhatsApp webhook", () => {
    it("verifies webhook with correct token", async () => {
      const res = await request(app)
        .get("/webhook")
        .query({
          "hub.mode": "subscribe",
          "hub.verify_token": env.WHATSAPP_VERIFY_TOKEN,
          "hub.challenge": "challenge-token-123",
        });

      expect(res.status).toBe(200);
      expect(res.text).toBe("challenge-token-123");
    });

    it("rejects webhook verification with wrong token", async () => {
      const res = await request(app)
        .get("/webhook")
        .query({
          "hub.mode": "subscribe",
          "hub.verify_token": "wrong-token",
          "hub.challenge": "challenge",
        });

      expect(res.status).toBe(403);
    });

    it("accepts POST webhook and returns 200 immediately", async () => {
      const res = await request(app).post("/webhook").send({ entry: [] });
      expect(res.status).toBe(200);
    });
  });

  describe("POST /webhook/simulate", () => {
    it("requires phone number", async () => {
      const res = await request(app).post("/webhook/simulate").send({ text: "hello" });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/phone/i);
    });

    it("simulates inbound message successfully", async () => {
      const res = await request(app)
        .post("/webhook/simulate")
        .send({ phone: "2508000000099", text: "menu" });

      expect(res.status).toBe(202);
      expect(res.body.ok).toBe(true);
      expect(res.body.status).toBe("processing");
    });

    it("simulates location pin", async () => {
      const res = await request(app)
        .post("/webhook/simulate")
        .send({ phone: "2508000000099", latitude: -1.9441, longitude: 30.0619 });

      expect(res.status).toBe(202);
      expect(res.body.ok).toBe(true);
    });
  });

  describe("USSD", () => {
    it("returns service info on GET", async () => {
      const res = await request(app).get("/ussd");
      expect(res.status).toBe(200);
      expect(res.body.service).toBe("Casa USSD");
    });

    it("requires sessionId and phoneNumber on POST", async () => {
      const res = await request(app).post("/ussd").send({});
      expect(res.status).toBe(400);
      expect(res.text).toMatch(/Missing sessionId/i);
    });
  });

  describe("Admin API", () => {
    it("rejects unauthenticated requests", async () => {
      const res = await request(app).get("/api/admin/stats");
      expect(res.status).toBe(401);
    });

    it("accepts Bearer token authentication", async () => {
      const res = await request(app)
        .get("/api/admin/stats")
        .set("Authorization", `Bearer ${env.ADMIN_API_KEY}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("users");
      expect(res.body).toHaveProperty("listings");
      expect(res.body).toHaveProperty("revenue");
    });

    it("accepts x-admin-key header", async () => {
      const res = await request(app)
        .get("/api/admin/stats")
        .set("x-admin-key", env.ADMIN_API_KEY!);

      expect(res.status).toBe(200);
    });

    it("creates a session token and accepts it for API calls", async () => {
      const login = await request(app)
        .post("/api/admin/session")
        .send({ apiKey: env.ADMIN_API_KEY });

      expect(login.status).toBe(200);
      expect(login.body.token).toBeTruthy();
      expect(login.body.expiresAt).toBeTruthy();

      vi.mocked(redis.get).mockResolvedValue(
        JSON.stringify({ fingerprint: "session-fp" })
      );

      const res = await request(app)
        .get("/api/admin/stats")
        .set("Authorization", `Bearer ${login.body.token}`);

      expect(res.status).toBe(200);
    });

    it("rejects invalid API key on session login", async () => {
      const res = await request(app)
        .post("/api/admin/session")
        .send({ apiKey: "wrong-key" });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/public/stats", () => {
    it("returns public stats without auth", async () => {
      const res = await request(app).get("/api/public/stats");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("listings");
      expect(res.body).toHaveProperty("users");
      expect(res.body.listings).toHaveProperty("available");
      expect(res.body.listings).toHaveProperty("residential");
      expect(res.body.listings).toHaveProperty("commercial");
      expect(res.body.users).toHaveProperty("tenants");
      expect(res.body.users).toHaveProperty("landlords");
    });
  });

  describe("GET /api/public/listings", () => {
    it("returns public listings without auth", async () => {
      const res = await request(app).get("/api/public/listings");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("listings");
      expect(res.body).toHaveProperty("updatedAt");
      expect(Array.isArray(res.body.listings)).toBe(true);
    });
  });
});
