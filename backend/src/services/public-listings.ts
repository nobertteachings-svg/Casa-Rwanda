import { env } from "../config/env.js";
import { query } from "../db/pool.js";
import {
  cloudinaryDeliveryUrl,
  cloudinaryMarketingUrl,
  isCloudinaryConfigured,
  parseCloudinaryRef,
  persistWhatsAppMedia,
  uploadImageFromUrl,
} from "./features/cloudinary-media.js";

export interface PublicListingMedia {
  type: "image" | "video";
  url: string;
  thumbUrl: string;
}

export interface PublicListing {
  houseId: string;
  type: string;
  propertyCategory: string;
  rent: number;
  location: string;
  media: PublicListingMedia[];
}

export interface PublicListingsResponse {
  listings: PublicListing[];
  updatedAt: string;
}

const MAX_PHOTOS_PER_LISTING = 3;

function publicCloudinaryUrl(ref: string, kind: "image" | "video"): string | null {
  return (
    cloudinaryMarketingUrl(ref, kind, "display") ??
    cloudinaryDeliveryUrl(ref) ??
    null
  );
}

/**
 * Marketing/public CDN URLs only.
 * Never expose /api/public/media?wa-media=… — those Meta IDs expire and 404.
 */
export function resolvePublicMediaUrl(ref: string, kind: "image" | "video"): string | null {
  return publicCloudinaryUrl(ref, kind);
}

export function resolvePublicThumbUrl(ref: string, kind: "image" | "video"): string | null {
  return cloudinaryMarketingUrl(ref, kind, "thumb") ?? publicCloudinaryUrl(ref, kind);
}

export function formatLocation(
  neighbourhood: string | null,
  city: string | null,
  town: string | null
): string {
  const parts = [neighbourhood, city ?? town].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Kenya";
}

export async function getPublicListings(limit = 24): Promise<PublicListingsResponse> {
  // Prefer rows that already have permanent Cloudinary photos.
  const result = await query<{
    house_id: string;
    type: string;
    property_category: string;
    rent: number;
    neighbourhood: string | null;
    city: string | null;
    town: string | null;
    photos: string[];
    videos: string[];
  }>(
    `SELECT house_id, type, property_category, rent, neighbourhood, city, town, photos, videos
     FROM houses
     WHERE status = 'active'
       AND cardinality(photos) > 0
     ORDER BY
       CASE WHEN EXISTS (
         SELECT 1 FROM unnest(photos) p WHERE p LIKE 'cloudinary:%'
       ) THEN 0 ELSE 1 END,
       created_at DESC
     LIMIT $1`,
    [Math.max(limit * 3, 24)]
  );

  const listings: PublicListing[] = [];

  for (const row of result.rows) {
    if (listings.length >= limit) break;

    const media: PublicListingMedia[] = [];
    for (const ref of row.photos ?? []) {
      if (media.length >= MAX_PHOTOS_PER_LISTING) break;
      const url = resolvePublicMediaUrl(ref, "image");
      if (!url) continue;
      const thumbUrl = resolvePublicThumbUrl(ref, "image") ?? url;
      media.push({ type: "image", url, thumbUrl });
    }

    if (media.length === 0) continue;

    listings.push({
      houseId: row.house_id,
      type: row.type,
      propertyCategory: row.property_category,
      rent: row.rent,
      location: formatLocation(row.neighbourhood, row.city, row.town),
      media,
    });
  }

  return { listings, updatedAt: new Date().toISOString() };
}

/** Replace a wa-media ref with a permanent Cloudinary ref when available. */
export async function promoteListingMediaRef(
  waRef: string,
  cloudinaryRef: string
): Promise<void> {
  if (!parseCloudinaryRef(cloudinaryRef)) return;
  await query(
    `UPDATE houses
     SET photos = array_replace(photos, $1::text, $2::text),
         videos = array_replace(videos, $1::text, $2::text),
         updated_at = NOW()
     WHERE $1 = ANY(photos) OR $1 = ANY(videos)`,
    [waRef, cloudinaryRef]
  );
}

export async function setHousePhotos(houseId: string, photos: string[]): Promise<boolean> {
  const result = await query(
    `UPDATE houses SET photos = $2::text[], updated_at = NOW() WHERE house_id = $1`,
    [houseId, photos]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Try to promote every wa-media photo/video to Cloudinary; drop refs that are dead.
 * Returns the updated photo list.
 */
export async function repairHouseMedia(houseId: string): Promise<{
  photos: string[];
  videos: string[];
  promoted: number;
  removed: number;
}> {
  const house = await query<{ photos: string[]; videos: string[] }>(
    `SELECT photos, videos FROM houses WHERE house_id = $1`,
    [houseId]
  );
  const row = house.rows[0];
  if (!row) {
    throw new Error("House not found");
  }

  let promoted = 0;
  let removed = 0;

  async function repairList(refs: string[], kind: "image" | "video"): Promise<string[]> {
    const next: string[] = [];
    for (const ref of refs ?? []) {
      if (ref.startsWith("cloudinary:")) {
        next.push(ref);
        continue;
      }
      if (!ref.startsWith("wa-media:")) {
        removed += 1;
        continue;
      }
      if (!isCloudinaryConfigured) {
        removed += 1;
        continue;
      }
      const mediaId = ref.slice("wa-media:".length);
      const permanent = await persistWhatsAppMedia(mediaId, kind);
      if (permanent.startsWith("cloudinary:")) {
        next.push(permanent);
        promoted += 1;
      } else {
        removed += 1;
      }
    }
    return next;
  }

  const photos = await repairList(row.photos ?? [], "image");
  const videos = await repairList(row.videos ?? [], "video");

  await query(
    `UPDATE houses SET photos = $2::text[], videos = $3::text[], updated_at = NOW()
     WHERE house_id = $1`,
    [houseId, photos, videos]
  );

  return { photos, videos, promoted, removed };
}

/** Admin: replace photos by uploading remote image URLs to Cloudinary. */
export async function replaceHousePhotosFromUrls(
  houseId: string,
  imageUrls: string[]
): Promise<string[]> {
  if (!isCloudinaryConfigured) {
    throw new Error("Cloudinary is not configured");
  }
  if (imageUrls.length === 0) {
    throw new Error("At least one image URL is required");
  }

  const refs: string[] = [];
  for (const url of imageUrls.slice(0, 8)) {
    const trimmed = url.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
      throw new Error(`Invalid image URL: ${trimmed}`);
    }
    refs.push(await uploadImageFromUrl(trimmed));
  }

  const ok = await setHousePhotos(houseId, refs);
  if (!ok) throw new Error("House not found");
  return refs;
}

export function publicApiBase(): string {
  return (env.PUBLIC_API_URL ?? "").replace(/\/$/, "");
}
