import sharp from "sharp";

/** Claude Vision downscales anything larger; keep at this edge to cut upload latency. */
const ID_VISION_MAX_EDGE = 1568;

export function detectImageMediaType(buffer: Buffer): "image/jpeg" | "image/png" | "image/webp" {
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return "image/png";
  if (buffer[0] === 0x52 && buffer[1] === 0x49) return "image/webp";
  return "image/jpeg";
}

export function guessMediaMimeType(buffer: Buffer, hint?: "image" | "video"): string {
  if (hint === "video" || (buffer.length >= 12 && buffer.slice(4, 8).toString("ascii") === "ftyp")) {
    return "video/mp4";
  }
  return detectImageMediaType(buffer);
}

/** Resize/compress ID photos before Claude Vision (full phone images are the main latency cost). */
export async function prepareIdImageForVision(
  buffer: Buffer
): Promise<{ base64: string; mediaType: "image/jpeg" }> {
  const prepared = await sharp(buffer)
    .rotate()
    .resize({
      width: ID_VISION_MAX_EDGE,
      height: ID_VISION_MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();

  return {
    base64: prepared.toString("base64"),
    mediaType: "image/jpeg",
  };
}
