import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../db/pool.js", () => ({
  query: vi.fn(),
}));

import { query } from "../db/pool.js";
import { getPublicStats } from "./public-stats.js";

const mockedQuery = vi.mocked(query);

describe("getPublicStats", () => {
  beforeEach(() => {
    mockedQuery.mockReset();
  });

  it("returns listing and user counts", async () => {
    mockedQuery
      .mockResolvedValueOnce({
        rows: [
          {
            available: "12",
            residential: "9",
            commercial: "3",
            total: "20",
          },
        ],
        rowCount: 1,
        command: "SELECT",
        oid: 0,
        fields: [],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            tenants: "45",
            landlords: "18",
            total: "63",
            new_week: "7",
          },
        ],
        rowCount: 1,
        command: "SELECT",
        oid: 0,
        fields: [],
      });

    const stats = await getPublicStats();

    expect(stats.listings).toEqual({
      available: 12,
      residential: 9,
      commercial: 3,
      total: 20,
    });
    expect(stats.users).toEqual({
      tenants: 45,
      landlords: 18,
      total: 63,
      newThisWeek: 7,
    });
    expect(stats.updatedAt).toBeTruthy();
  });
});
