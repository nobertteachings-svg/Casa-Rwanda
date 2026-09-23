import { describe, expect, it, vi, beforeEach } from "vitest";

const { redisMock } = vi.hoisted(() => {
  const redisMock = {
    status: "ready" as string,
    set: vi.fn(),
    del: vi.fn(),
    rpush: vi.fn(),
    lrem: vi.fn(),
    llen: vi.fn(),
    rpoplpush: vi.fn(),
    pipeline: vi.fn(() => ({
      rpush: vi.fn(),
      exec: vi.fn().mockResolvedValue([]),
    })),
  };
  return { redisMock };
});

vi.mock("../redis/client.js", () => ({
  redis: redisMock,
}));

vi.mock("../flows/router.js", () => ({
  routeMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../monitoring.js", () => ({
  captureError: vi.fn(),
}));

import { routeMessage } from "../flows/router.js";
import {
  enqueueWebhookMessages,
  getWebhookQueueDepths,
  recoverOrphanedWebhookJobs,
} from "./webhook-queue.js";

describe("webhook-queue reliability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisMock.status = "ready";
    redisMock.set.mockResolvedValue("OK");
    redisMock.del.mockResolvedValue(1);
    redisMock.rpush.mockResolvedValue(1);
    redisMock.lrem.mockResolvedValue(1);
    redisMock.llen.mockResolvedValue(0);
    redisMock.rpoplpush.mockResolvedValue(null);
  });

  it("falls back to direct routing when Redis is down", async () => {
    redisMock.status = "end";
    await enqueueWebhookMessages([
      {
        from: "2508000000001",
        id: "sim-1",
        timestamp: "1",
        type: "text",
        text: "hi",
      },
    ]);
    expect(routeMessage).toHaveBeenCalledOnce();
  });

  it("reports queue depths", async () => {
    redisMock.llen
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(3);
    const depths = await getWebhookQueueDepths();
    expect(depths).toEqual({ queued: 2, processing: 1, dlq: 3 });
  });

  it("recovers orphaned processing jobs", async () => {
    redisMock.rpoplpush
      .mockResolvedValueOnce(JSON.stringify({ id: "m1" }))
      .mockResolvedValueOnce(null);
    const n = await recoverOrphanedWebhookJobs();
    expect(n).toBe(1);
  });
});
