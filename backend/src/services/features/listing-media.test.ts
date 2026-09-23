import { describe, expect, it, vi, beforeEach } from "vitest";
import { parseWaMediaRef, sendHouseListingMedia, clearOutboundMediaCache } from "./listing-media.js";
import type { House } from "../houses.js";

vi.mock("../whatsapp.js", () => ({
  sendImageMessage: vi.fn().mockResolvedValue(true),
  sendVideoMessage: vi.fn().mockResolvedValue(true),
  sendTextMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./voice.js", () => ({
  fetchWhatsAppMedia: vi.fn().mockImplementation(async (id: string) => ({
    buffer: Buffer.from(id),
    mimeType: id.includes("video") ? "video/mp4" : "image/jpeg",
  })),
  uploadWhatsAppMedia: vi.fn().mockImplementation(async (_buf: Buffer, mime: string) =>
    mime.startsWith("video/") ? "outbound-video" : "outbound-photo"
  ),
}));

import { sendImageMessage, sendVideoMessage, sendTextMessage } from "../whatsapp.js";
import { uploadWhatsAppMedia } from "./voice.js";

const baseHouse: House = {
  house_id: "CASA-1001",
  landlord_phone: "2508000000001",
  type: "2-bedroom",
  rent: 50000,
  months_upfront: 2,
  latitude: -1.9441,
  longitude: 30.0619,
  neighbourhood: "Kimironko",
  city: "Kigali",
  region: "gasabo",
  fenced: true,
  water: true,
  borehole: false,
  parking: true,
  electricity: true,
  furnished: false,
  security: false,
  photos: ["wa-media:photo1", "wa-media:photo2"],
  videos: ["wa-media:video1"],
  ai_description: null,
  status: "active",
  created_at: new Date(),
};

describe("parseWaMediaRef", () => {
  it("extracts WhatsApp media id from ref", () => {
    expect(parseWaMediaRef("wa-media:abc123")).toBe("abc123");
  });

  it("returns null for invalid refs", () => {
    expect(parseWaMediaRef("cloudinary:abc")).toBeNull();
    expect(parseWaMediaRef("")).toBeNull();
  });
});

describe("sendHouseListingMedia", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearOutboundMediaCache();
  });

  it("re-uploads and sends video first, then photos, directly in chat", async () => {
    await sendHouseListingMedia("2508000000099", baseHouse, "en", { listIndex: 1 });

    expect(uploadWhatsAppMedia).toHaveBeenCalled();
    expect(sendTextMessage).toHaveBeenCalledWith(
      "2508000000099",
      expect.stringContaining("CASA-1001")
    );
    expect(sendVideoMessage).toHaveBeenCalledWith(
      "2508000000099",
      "outbound-video",
      expect.stringContaining("CASA-1001")
    );
    expect(sendImageMessage).toHaveBeenCalledTimes(2);
    expect(sendImageMessage).toHaveBeenNthCalledWith(1, "2508000000099", "outbound-photo", undefined);
  });

  it("falls back to text when no media is available", async () => {
    const house = { ...baseHouse, photos: [], videos: [] };
    await sendHouseListingMedia("2508000000099", house, "en");

    expect(sendTextMessage).toHaveBeenCalledWith(
      "2508000000099",
      expect.stringContaining("CASA-1001")
    );
    expect(sendImageMessage).not.toHaveBeenCalled();
    expect(sendVideoMessage).not.toHaveBeenCalled();
  });
});
