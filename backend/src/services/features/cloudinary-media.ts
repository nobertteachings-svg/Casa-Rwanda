import { v2 as cloudinary } from "cloudinary";
import { env } from "../../config/env.js";
import { fetchWhatsAppMedia } from "./voice.js";

export const isCloudinaryConfigured = Boolean(
  env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export function parseCloudinaryRef(ref: string): string | null {
  const match = ref.match(/^cloudinary:(.+)$/);
  return match?.[1] ?? null;
}

export function cloudinaryDeliveryUrl(ref: string): string | null {
  const publicId = parseCloudinaryRef(ref);
  if (!publicId || !isCloudinaryConfigured) return null;

  const isVideo = publicId.includes("/videos/") || ref.includes(":video:");
  return cloudinary.url(publicId, {
    secure: true,
    resource_type: isVideo ? "video" : "image",
  });
}

/** Fast CDN URLs for marketing (auto format/quality + sized). */
export function cloudinaryMarketingUrl(
  ref: string,
  kind: "image" | "video",
  variant: "display" | "thumb" = "display"
): string | null {
  const publicId = parseCloudinaryRef(ref);
  if (!publicId || !isCloudinaryConfigured) return null;

  if (kind === "video") {
    return cloudinary.url(publicId, {
      secure: true,
      resource_type: "video",
      transformation:
        variant === "thumb"
          ? [{ width: 320, crop: "fill", quality: "auto", fetch_format: "auto" }]
          : [{ width: 960, crop: "limit", quality: "auto", fetch_format: "auto" }],
    });
  }

  return cloudinary.url(publicId, {
    secure: true,
    resource_type: "image",
    transformation:
      variant === "thumb"
        ? [{ width: 240, height: 160, crop: "fill", quality: "auto", fetch_format: "auto" }]
        : [{ width: 960, height: 640, crop: "fill", quality: "auto", fetch_format: "auto" }],
  });
}

function uploadBuffer(
  buffer: Buffer,
  folder: string,
  resourceType: "image" | "video"
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `casa/${folder}`,
        resource_type: resourceType,
      },
      (err, result) => {
        if (err || !result?.public_id) {
          reject(err ?? new Error("Cloudinary upload failed"));
          return;
        }
        resolve(`cloudinary:${result.public_id}`);
      }
    );
    stream.end(buffer);
  });
}

export async function uploadImageBuffer(buffer: Buffer): Promise<string> {
  if (!isCloudinaryConfigured) {
    throw new Error("Cloudinary is not configured");
  }
  return uploadBuffer(buffer, "photos", "image");
}

export async function uploadVideoBuffer(buffer: Buffer): Promise<string> {
  if (!isCloudinaryConfigured) {
    throw new Error("Cloudinary is not configured");
  }
  return uploadBuffer(buffer, "videos", "video");
}

/** Upload a remote image URL straight to Cloudinary (admin repair / backfill). */
export async function uploadImageFromUrl(imageUrl: string): Promise<string> {
  if (!isCloudinaryConfigured) {
    throw new Error("Cloudinary is not configured");
  }
  const result = await cloudinary.uploader.upload(imageUrl, {
    folder: "casa/photos",
    resource_type: "image",
  });
  if (!result.public_id) {
    throw new Error("Cloudinary upload failed");
  }
  return `cloudinary:${result.public_id}`;
}

/** Download WhatsApp media and store permanently on Cloudinary when configured. */
export async function persistWhatsAppMedia(
  waMediaId: string,
  kind: "image" | "video"
): Promise<string> {
  const fallback = `wa-media:${waMediaId}`;
  if (!isCloudinaryConfigured) return fallback;

  const file = await fetchWhatsAppMedia(waMediaId);
  if (!file) return fallback;

  try {
    return await uploadBuffer(file.buffer, kind === "video" ? "videos" : "photos", kind);
  } catch (err) {
    console.error("Cloudinary persist failed:", err);
    return fallback;
  }
}
