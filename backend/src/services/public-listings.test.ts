import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../db/pool.js", () => ({
  query: vi.fn(),
}));

vi.mock("./features/cloudinary-media.js", () => ({
  isCloudinaryConfigured: true,
  parseCloudinaryRef: vi.fn((ref: string) =>
    ref.startsWith("cloudinary:") ? ref.slice("cloudinary:".length) : null
  ),
  cloudinaryDeliveryUrl: vi.fn((ref: string) =>
    ref.startsWith("cloudinary:")
      ? `https://res.cloudinary.com/demo/image/upload/${ref.slice("cloudinary:".length)}.jpg`
      : null
  ),
  cloudinaryMarketingUrl: vi.fn((ref: string) =>
    ref.startsWith("cloudinary:")
      ? `https://res.cloudinary.com/demo/image/upload/w_960/${ref.slice("cloudinary:".length)}.jpg`
      : null
  ),
  persistWhatsAppMedia: vi.fn(),
  uploadImageFromUrl: vi.fn(),
}));

vi.mock("../config/env.js", () => ({
  env: {
    PUBLIC_API_URL: "https://api.casahomesrwanda.com",
  },
}));

import { query } from "../db/pool.js";
import { getPublicListings, resolvePublicMediaUrl } from "./public-listings.js";

const mockedQuery = vi.mocked(query);

describe("resolvePublicMediaUrl", () => {
  it("returns CDN URL for Cloudinary refs only", () => {
    expect(resolvePublicMediaUrl("cloudinary:casa/photos/abc", "image")).toContain(
      "res.cloudinary.com"
    );
  });

  it("does not expose expired WhatsApp media proxy URLs", () => {
    expect(resolvePublicMediaUrl("wa-media:abc123", "image")).toBeNull();
  });
});

describe("getPublicListings", () => {
  beforeEach(() => {
    mockedQuery.mockReset();
  });

  it("only returns listings with permanent Cloudinary photos", async () => {
    mockedQuery.mockResolvedValueOnce({
      rows: [
        {
          house_id: "CASA-1001",
          type: "apartment",
          property_category: "residential",
          rent: 75000,
          neighbourhood: "Kimironko",
          city: "Kigali",
          town: "Kigali",
          photos: ["cloudinary:casa/photos/one", "wa-media:expired"],
          videos: ["wa-media:vid1"],
        },
        {
          house_id: "CASA-1002",
          type: "room",
          property_category: "residential",
          rent: 40000,
          neighbourhood: null,
          city: null,
          town: null,
          photos: ["wa-media:dead"],
          videos: [],
        },
      ],
      rowCount: 2,
      command: "SELECT",
      oid: 0,
      fields: [],
    });

    const data = await getPublicListings();

    expect(data.listings).toHaveLength(1);
    expect(data.listings[0].houseId).toBe("CASA-1001");
    expect(data.listings[0].media).toHaveLength(1);
    expect(data.listings[0].media[0].url).toContain("cloudinary.com");
  });
});
