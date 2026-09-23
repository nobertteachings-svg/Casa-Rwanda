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

describe("forwardGeocode", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns coordinates from Nominatim", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { lat: "3.8480", lon: "11.5021", display_name: "Kimironko, Kigali, Rwanda" },
        ],
      })
    );

    const result = await forwardGeocode("Kimironko, Kigali");
    expect(result).toMatchObject({ latitude: 3.848, longitude: 11.5021 });
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
          { lat: "4.0511", lon: "9.7679", display_name: "Kimironko, Kigali" },
        ],
      })
    );

    const result = await resolveSearchCoordinates({
      neighbourhood: "Kimironko",
      town: "Kigali",
    });
    expect(result?.latitude).toBeCloseTo(4.0511);
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

    const result = await reverseGeocode(3.848, 11.5021);
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

    await reverseGeocode(4.0511, 9.7679);

    expect(redis.set).toHaveBeenCalledWith(
      "casa:geo:rev:4.0511:9.7679",
      expect.stringContaining("Kimironko"),
      "EX",
      expect.any(Number)
    );
  });
});
