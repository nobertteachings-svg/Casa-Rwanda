import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  reportListingAlreadyRented,
  flagListing,
} from "../features/community-flag.js";

vi.mock("../../db/pool.js", () => ({
  query: vi.fn(),
}));

import { query } from "../../db/pool.js";

const mockedQuery = vi.mocked(query);

describe("community flag", () => {
  beforeEach(() => {
    mockedQuery.mockReset();
  });

  it("reportListingAlreadyRented hides active listing and logs review", async () => {
    mockedQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 1, command: "INSERT", oid: 0, fields: [] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1, command: "UPDATE", oid: 0, fields: [] });

    const hidden = await reportListingAlreadyRented("CASA-1001", "2508000000001");

    expect(hidden).toBe(true);
    expect(mockedQuery).toHaveBeenCalledTimes(2);
    expect(mockedQuery.mock.calls[1][0]).toContain("status = 'inactive'");
  });

  it("flagListing marks listing as flagged for other issues", async () => {
    mockedQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 1, command: "INSERT", oid: 0, fields: [] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1, command: "UPDATE", oid: 0, fields: [] });

    await flagListing("CASA-1002", "2508000000002", "Misleading photos");

    expect(mockedQuery.mock.calls[1][0]).toContain("status = 'flagged'");
  });
});
