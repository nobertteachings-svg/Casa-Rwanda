import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { detectImageMediaType, guessMediaMimeType, prepareIdImageForVision } from "./media.js";

describe("guessMediaMimeType", () => {
  it("detects mp4 video from ftyp header", () => {
    const mp4 = Buffer.alloc(12);
    mp4.write("ftyp", 4, "ascii");
    expect(guessMediaMimeType(mp4)).toBe("video/mp4");
  });

  it("detects jpeg images", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    expect(guessMediaMimeType(jpeg)).toBe("image/jpeg");
    expect(detectImageMediaType(jpeg)).toBe("image/jpeg");
  });
});

describe("prepareIdImageForVision", () => {
  it("downscales large images and returns jpeg base64", async () => {
    const large = await sharp({
      create: {
        width: 3200,
        height: 2400,
        channels: 3,
        background: { r: 200, g: 180, b: 160 },
      },
    })
      .png()
      .toBuffer();

    const prepared = await prepareIdImageForVision(large);
    expect(prepared.mediaType).toBe("image/jpeg");
    expect(prepared.base64.length).toBeGreaterThan(100);

    const meta = await sharp(Buffer.from(prepared.base64, "base64")).metadata();
    expect(meta.format).toBe("jpeg");
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(1568);
  });
});
