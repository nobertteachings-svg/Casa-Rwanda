import { describe, expect, it, vi, beforeEach } from "vitest";
import { forwardGeocode, resolveSearchCoordinates, reverseGeocode } from "./geocoding.js";
import { redis } from "../redis/client.js";

vi.mock("../redis/client.js", () => ({
  redis: {
    status: "ready",
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
  },
}));

const KIMIRONKO = { lat: "-1.9500", lon: "30.1250" };

describe("forwardGeocode", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns coordinates from Nominatim scoped to Rwanda", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { lat: KIMIRONKO.lat, lon: KIMIRONKO.lon, display_name: "Kimironko, Kigali, Rwanda" },
      ],
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await forwardGeocode("Kimironko, Kigali");
    expect(result).toMatchObject({ latitude: -1.95, longitude: 30.125 });

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("countrycodes=rw");
    expect(url).toContain("Rwanda");
  });

  it("returns null when geocoder finds nothing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
    );

    expect(await forwardGeocode("unknown place xyz")).toBeNull();
  });
});

describe("resolveSearchCoordinates", () => {
  it("combines neighbourhood and town into a query", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { lat: KIMIRONKO.lat, lon: KIMIRONKO.lon, display_name: "Kimironko, Kigali" },
        ],
      })
    );

    const result = await resolveSearchCoordinates({
      neighbourhood: "Kimironko",
      town: "Kigali",
    });
    expect(result?.latitude).toBeCloseTo(-1.95);
  });
});

describe("reverseGeocode", () => {
  beforeEach(() => {
    vi.mocked(redis.get).mockResolvedValue(null);
    vi.mocked(redis.set).mockClear();
  });

  it("returns cached reverse geocode without calling Nominatim", async () => {
    vi.mocked(redis.get).mockResolvedValue(
      JSON.stringify({
        neighbourhood: "Kimironko",
        city: "Kigali",
        displayName: "Kimironko, Kigali, Rwanda",
      })
    );

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await reverseGeocode(-1.95, 30.125);
    expect(result.neighbourhood).toBe("Kimironko");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("caches reverse geocode results in Redis", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          display_name: "Kimironko, Kigali, Rwanda",
          address: { suburb: "Kimironko", city: "Kigali" },
        }),
      })
    );

    await reverseGeocode(-1.95, 30.125);

    expect(redis.set).toHaveBeenCalledWith(
      "casa:geo:rev:-1.9500:30.1250",
      expect.stringContaining("Kimironko"),
      "EX",
      expect.any(Number)
    );
  });
});
