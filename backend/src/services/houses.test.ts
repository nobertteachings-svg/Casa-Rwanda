import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  createHouse,
  formatHouseSummary,
  formatLocation,
  googleMapsLink,
  haversineKm,
  searchNearbyHouses,
} from "../services/houses.js";
import { makeHouse } from "../test/fixtures.js";

vi.mock("../db/pool.js", () => ({
  query: vi.fn(),
}));

vi.mock("../services/whatsapp.js", () => ({
  sendTextMessage: vi.fn(),
}));

import { query } from "../db/pool.js";

const mockedQuery = vi.mocked(query);

function mockPostgisUnavailable() {
  mockedQuery.mockResolvedValueOnce({
    rows: [{ ok: false }],
    rowCount: 1,
    command: "SELECT",
    oid: 0,
    fields: [],
  });
}

describe("houses service", () => {
  beforeEach(async () => {
    mockedQuery.mockReset();
    const { resetPostgisCacheForTests } = await import("./house-search.js");
    resetPostgisCacheForTests();
  });

  it("computes haversine distance between two GPS points", () => {
    const kimironko = { lat: 0.3476, lon: 32.5825 };
    const nearby = haversineKm(kimironko.lat, kimironko.lon, 0.35, 32.59);
    const far = haversineKm(kimironko.lat, kimironko.lon, 2.7746, 32.299); // Nyagatare-ish
    expect(nearby).toBeLessThan(2);
    expect(far).toBeGreaterThan(150);
  });

  it("builds Google Maps link from coordinates", () => {
    expect(googleMapsLink(9.0765, 7.3986)).toBe(
      "https://maps.google.com/?q=9.0765,7.3986"
    );
  });

  it("formats location from quarter, town, and region", () => {
    const house = makeHouse();
    expect(formatLocation(house, "en")).toBe("Kimironko, Kigali, Gasabo (Kigali)");
    expect(formatLocation(makeHouse({ neighbourhood: null, town: null, city: null, region: null }), "en")).toBe(
      "Unknown area"
    );
  });

  it("formats house summary with category, subtype, and prepaid meter", () => {
    const summary = formatHouseSummary(makeHouse(), "en");
    expect(summary).toContain("CASA-1001");
    expect(summary).toContain("Residential");
    expect(summary).toContain("2 bedroom");
    expect(summary).toContain("Kimironko");
    expect(summary).toContain("Token meter");
    expect(summary).toContain("350,000");
  });

  it("formats commercial office listing in French", () => {
    const summary = formatHouseSummary(
      makeHouse({
        property_category: "commercial",
        property_subtype: "office",
        neighbourhood: "Kimironko",
        town: "Kigali",
        region: "gasabo",
      }),
      "fr"
    );
    expect(summary).toContain("Commercial");
    expect(summary).toContain("Espace bureau");
    expect(summary).toContain("Kimironko");
  });

  it("filters search results by category, subtype, rent, and electricity meter", async () => {
    const residential = makeHouse({ house_id: "CASA-1", distance_km: 0.2 });
    const commercial = makeHouse({
      house_id: "CASA-2",
      property_category: "commercial",
      property_subtype: "office",
      latitude: 3.849,
      longitude: 11.503,
      rent: 200000,
      electricity_meter: "postpaid",
      distance_km: 0.3,
    });

    mockPostgisUnavailable();
    mockedQuery.mockResolvedValueOnce({
      rows: [commercial],
      rowCount: 1,
      command: "SELECT",
      oid: 0,
      fields: [],
    });

    const commercialOnly = await searchNearbyHouses(9.0765, 7.3986, 5, {
      property_category: "commercial",
    });
    expect(commercialOnly).toHaveLength(1);
    expect(commercialOnly[0].house_id).toBe("CASA-2");

    mockedQuery.mockResolvedValueOnce({
      rows: [residential],
      rowCount: 1,
      command: "SELECT",
      oid: 0,
      fields: [],
    });

    const prepaidOnly = await searchNearbyHouses(9.0765, 7.3986, 5, {
      electricity_meter: "prepaid",
    });
    expect(prepaidOnly).toHaveLength(1);
    expect(prepaidOnly[0].house_id).toBe("CASA-1");

    mockedQuery.mockResolvedValueOnce({
      rows: [residential],
      rowCount: 1,
      command: "SELECT",
      oid: 0,
      fields: [],
    });

    const maxRent = await searchNearbyHouses(9.0765, 7.3986, 5, {
      maxRent: 100000,
    });
    expect(maxRent.map((h) => h.house_id)).toEqual(["CASA-1"]);
  });

  it("sorts search results by distance ascending", async () => {
    const near = makeHouse({
      house_id: "NEAR",
      latitude: 9.0770,
      longitude: 7.3990,
      distance_km: 0.06,
    });
    const mid = makeHouse({
      house_id: "MID",
      latitude: 3.86,
      longitude: 11.51,
      distance_km: 1.4,
    });
    mockPostgisUnavailable();
    mockedQuery.mockResolvedValueOnce({
      rows: [near, mid],
      rowCount: 2,
      command: "SELECT",
      oid: 0,
      fields: [],
    });

    const results = await searchNearbyHouses(9.0765, 7.3986, 10);
    expect(results[0].house_id).toBe("NEAR");
    expect(results[0].distance_km).toBeLessThan(results[1].distance_km);
  });

  it("rejects createHouse without a walkthrough video", async () => {
    await expect(
      createHouse({
        landlord_phone: "2508000000001",
        type: "room",
        property_category: "residential",
        property_subtype: "single_room",
        region: "gasabo",
        town: "Kigali",
        rent: 50000,
        months_upfront: 1,
        latitude: 9.0765,
        longitude: 7.3986,
        neighbourhood: "Kimironko",
        videos: [],
      })
    ).rejects.toThrow(/video is required/i);
  });

  it("creates house with electricity_meter and syncs legacy electricity flag", async () => {
    const created = makeHouse({ house_id: "CASA-NEW" });
    mockedQuery.mockResolvedValueOnce({
      rows: [created],
      rowCount: 1,
      command: "INSERT",
      oid: 0,
      fields: [],
    });
    mockedQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 0,
      command: "SELECT",
      oid: 0,
      fields: [],
    });

    const result = await createHouse({
      landlord_phone: "2508000000001",
      type: "apartment",
      property_category: "commercial",
      property_subtype: "shop",
      region: "gasabo",
      town: "Kigali",
      rent: 150000,
      months_upfront: 2,
      latitude: 0.3476,
      longitude: 32.5825,
      neighbourhood: "Kimironko",
      electricity_meter: "prepaid",
      videos: ["wa-media:video1"],
    });

    expect(result.house_id).toBe("CASA-NEW");
    const insertArgs = mockedQuery.mock.calls[0][1] as unknown[];
    expect(insertArgs[16]).toBe(true);
    expect(insertArgs[17]).toBe("prepaid");
  });

  it("updates listing status for the owning landlord only", async () => {
    mockedQuery.mockResolvedValueOnce({
      rows: [],
      rowCount: 1,
      command: "UPDATE",
      oid: 0,
      fields: [],
    });

    const { updateHouseStatusByLandlord, isListingAvailable } = await import("./houses.js");
    const ok = await updateHouseStatusByLandlord("CASA-1001", "2508000000099", "inactive");

    expect(ok).toBe(true);
    expect(mockedQuery.mock.calls[0][0]).toContain("landlord_phone = $2");
    expect(isListingAvailable(makeHouse({ status: "active" }))).toBe(true);
    expect(isListingAvailable(makeHouse({ status: "inactive" }))).toBe(false);
  });
});
