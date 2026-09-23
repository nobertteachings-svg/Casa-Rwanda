import { env, isWhatsAppConfigured } from "../../config/env.js";
import { guessMediaMimeType } from "./media.js";

const GRAPH_API = "https://graph.facebook.com/v21.0";
const API_TIMEOUT_MS = 30_000;

function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(API_TIMEOUT_MS) });
}

export interface WhatsAppMediaFile {
  buffer: Buffer;
  mimeType: string;
}

export async function fetchWhatsAppMedia(mediaId: string): Promise<WhatsAppMediaFile | null> {
  if (!isWhatsAppConfigured) return null;

  const metaRes = await fetchWithTimeout(`${GRAPH_API}/${mediaId}`, {
    headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}` },
  });
  if (!metaRes.ok) return null;

  const meta = (await metaRes.json()) as { url?: string; mime_type?: string };
  if (!meta.url) return null;

  const fileRes = await fetchWithTimeout(meta.url, {
    headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}` },
  });
  if (!fileRes.ok) return null;

  const buffer = Buffer.from(await fileRes.arrayBuffer());
  const mimeType = meta.mime_type ?? guessMediaMimeType(buffer);

  return { buffer, mimeType };
}

export async function downloadWhatsAppMedia(mediaId: string): Promise<Buffer | null> {
  const file = await fetchWhatsAppMedia(mediaId);
  return file?.buffer ?? null;
}

/** Re-upload media so it can be delivered inline to other WhatsApp users. */
export async function uploadWhatsAppMedia(
  buffer: Buffer,
  mimeType: string
): Promise<string | null> {
  if (!isWhatsAppConfigured) return `mock-outbound-${buffer.length}`;

  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", mimeType);
  form.append(
    "file",
    new Blob([new Uint8Array(buffer)], { type: mimeType }),
    mimeType.startsWith("video/") ? "walkthrough.mp4" : "photo.jpg"
  );

  const response = await fetchWithTimeout(`${GRAPH_API}/${env.WHATSAPP_PHONE_NUMBER_ID}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}` },
    body: form,
  });

  if (!response.ok) {
    console.error("WhatsApp media upload failed:", await response.text());
    return null;
  }

  const payload = (await response.json()) as { id?: string };
  return payload.id ?? null;
}

/** Voice note pipeline — downloads media; full STT requires Whisper integration */
export async function processVoiceNote(
  mediaId: string,
  lang: "en" | "fr"
): Promise<{ text: string | null; notice?: string }> {
  await downloadWhatsAppMedia(mediaId);

  const notice =
    lang === "fr"
      ? "🎤 Note vocale reçue ! Décrivez brièvement en texte ce que vous cherchez (transcription vocale complète bientôt disponible)."
      : "🎤 Voice note received! Please type a brief description of what you need (full voice transcription coming soon).";

  return { text: null, notice };
}
