import type { Language } from "../../i18n/messages.js";
import { redis } from "../../redis/client.js";
import type { House } from "../houses.js";
import { formatHouseSummary } from "../houses.js";
import {
  sendImageLink,
  sendImageMessage,
  sendTextMessage,
  sendVideoLink,
  sendVideoMessage,
} from "../whatsapp.js";
import { cloudinaryDeliveryUrl } from "./cloudinary-media.js";
import { guessMediaMimeType } from "./media.js";
import { fetchWhatsAppMedia, uploadWhatsAppMedia } from "./voice.js";

export function parseWaMediaRef(ref: string): string | null {
  const match = ref.match(/^wa-media:(.+)$/);
  return match?.[1] ?? null;
}

const OUTBOUND_CACHE_TTL = 60 * 60 * 24 * 7;

async function getCachedOutbound(key: string): Promise<string | null> {
  if (redis.status !== "ready") return null;
  try {
    return await redis.get(`casa:media:outbound:${key}`);
  } catch {
    return null;
  }
}

async function setCachedOutbound(key: string, mediaId: string): Promise<void> {
  if (redis.status !== "ready") return;
  try {
    await redis.set(`casa:media:outbound:${key}`, mediaId, "EX", OUTBOUND_CACHE_TTL);
  } catch {
    /* ignore cache write failures */
  }
}

export function clearOutboundMediaCache(): void {
  /* kept for tests — Redis keys expire automatically */
}

async function resolveOutboundMediaId(
  waRef: string,
  kind: "image" | "video"
): Promise<string | null> {
  const cacheKey = `${kind}:${waRef}`;
  const cached = await getCachedOutbound(cacheKey);
  if (cached) return cached;

  const sourceId = parseWaMediaRef(waRef);
  if (!sourceId) return null;

  const file = await fetchWhatsAppMedia(sourceId);
  if (!file) return null;

  const mimeType =
    kind === "video"
      ? file.mimeType.startsWith("video/")
        ? file.mimeType
        : guessMediaMimeType(file.buffer, "video")
      : file.mimeType.startsWith("image/")
        ? file.mimeType
        : guessMediaMimeType(file.buffer, "image");

  const outboundId = await uploadWhatsAppMedia(file.buffer, mimeType);
  if (outboundId) await setCachedOutbound(cacheKey, outboundId);
  return outboundId;
}

async function sendMediaRef(
  phone: string,
  ref: string,
  kind: "image" | "video",
  caption?: string
): Promise<boolean> {
  const cloudinaryUrl = cloudinaryDeliveryUrl(ref);
  if (cloudinaryUrl) {
    return kind === "video"
      ? sendVideoLink(phone, cloudinaryUrl, caption)
      : sendImageLink(phone, cloudinaryUrl, caption);
  }

  const mediaId = await resolveOutboundMediaId(ref, kind);
  if (!mediaId) return false;

  return kind === "video"
    ? sendVideoMessage(phone, mediaId, caption)
    : sendImageMessage(phone, mediaId, caption);
}

function listingHeader(house: House, lang: Language, listIndex?: number): string {
  if (listIndex !== undefined) {
    return `🏠 *${listIndex} — ${house.house_id}*`;
  }
  return `🏠 *${house.house_id}*`;
}

export async function sendHouseListingMedia(
  phone: string,
  house: House,
  lang: Language,
  options?: {
    listIndex?: number;
    caption?: string;
    includeVideo?: boolean;
  }
): Promise<void> {
  const summary =
    options?.caption ??
    (options?.listIndex !== undefined
      ? formatHouseSummary(house, lang)
      : formatHouseSummary(house, lang));

  const photos = house.photos ?? [];
  const videos = options?.includeVideo !== false ? (house.videos ?? []) : [];

  await sendTextMessage(phone, listingHeader(house, lang, options?.listIndex));

  let sentSummary = false;
  const videoCaption =
    lang === "fr"
      ? `🎥 Vidéo du logement — ${house.house_id}`
      : `🎥 Property video — ${house.house_id}`;

  for (const ref of videos) {
    const ok = await sendMediaRef(phone, ref, "video", sentSummary ? videoCaption : summary);
    if (!sentSummary && ok) sentSummary = true;
  }

  for (const ref of photos) {
    const ok = await sendMediaRef(phone, ref, "image", sentSummary ? undefined : summary);
    if (!sentSummary && ok) sentSummary = true;
  }

  if (!sentSummary) {
    await sendTextMessage(phone, summary);
  }
}
