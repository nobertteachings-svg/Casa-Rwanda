import { env, isWhatsAppConfigured } from "../config/env.js";

const GRAPH_API = "https://graph.facebook.com/v21.0";
const API_TIMEOUT_MS = 10_000;

function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(API_TIMEOUT_MS) });
}

export interface IncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: "text" | "image" | "audio" | "video" | "location" | "interactive" | "button" | "unknown";
  text?: string;
  /** Stable id from a tapped button or list row (e.g. "1", "2"). */
  choiceId?: string;
  imageId?: string;
  audioId?: string;
  videoId?: string;
  latitude?: number;
  longitude?: number;
  name?: string;
  /** App upload reference, already stored outside WhatsApp media IDs. */
  mediaRef?: string;
}

export interface MenuOption {
  id: string;
  title: string;
  description?: string;
}

async function sendWhatsAppPayload(to: string, payload: Record<string, unknown>): Promise<boolean> {
  if (!isWhatsAppConfigured) {
    console.log(`[WhatsApp mock] → ${to}: ${JSON.stringify(payload).slice(0, 120)}...`);
    return true;
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    const response = await fetchWithTimeout(
      `${GRAPH_API}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          ...payload,
        }),
      }
    );

    if (response.ok) return true;

    const err = await response.text();
    const retryable = response.status === 429 || response.status >= 500;
    if (retryable && attempt < 3) {
      await new Promise((r) => setTimeout(r, attempt * 400));
      continue;
    }

    console.error("WhatsApp send failed:", err);
    return false;
  }

  return false;
}

export async function sendImageMessage(
  to: string,
  mediaId: string,
  caption?: string
): Promise<boolean> {
  const image: Record<string, string> = { id: mediaId };
  if (caption) image.caption = caption.slice(0, 1024);
  return sendWhatsAppPayload(to, { type: "image", image });
}

export async function sendVideoMessage(
  to: string,
  mediaId: string,
  caption?: string
): Promise<boolean> {
  const video: Record<string, string> = { id: mediaId };
  if (caption) video.caption = caption.slice(0, 1024);
  return sendWhatsAppPayload(to, { type: "video", video });
}

export async function sendImageLink(
  to: string,
  url: string,
  caption?: string
): Promise<boolean> {
  const image: Record<string, string> = { link: url };
  if (caption) image.caption = caption.slice(0, 1024);
  return sendWhatsAppPayload(to, { type: "image", image });
}

export async function sendVideoLink(
  to: string,
  url: string,
  caption?: string
): Promise<boolean> {
  const video: Record<string, string> = { link: url };
  if (caption) video.caption = caption.slice(0, 1024);
  return sendWhatsAppPayload(to, { type: "video", video });
}

/** Returns false so the app falls back to click-to-chat OTP (no Meta auth template required). */
export async function sendAuthenticationOtp(
  _to: string,
  _code: string,
  _lang: "en" | "fr" = "en",
  _options?: { discover?: boolean }
): Promise<boolean> {
  return false;
}

export async function sendTextMessage(to: string, body: string): Promise<void> {
  const ok = await sendWhatsAppPayload(to, {
    type: "text",
    text: { preview_url: true, body },
  });
  if (!ok) {
    throw new Error("WhatsApp text send failed");
  }
}

/** Up to 3 tappable reply buttons. */
export async function sendButtonMessage(
  to: string,
  body: string,
  options: MenuOption[]
): Promise<void> {
  if (options.length === 0 || options.length > 3) {
    throw new Error("Button messages support 1–3 options");
  }

  const ok = await sendWhatsAppPayload(to, {
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: body.slice(0, 1024) },
      action: {
        buttons: options.map((opt) => ({
          type: "reply",
          reply: {
            id: opt.id.slice(0, 256),
            title: opt.title.slice(0, 20),
          },
        })),
      },
    },
  });

  if (!ok) {
    throw new Error("WhatsApp button send failed");
  }
}

/** Scrollable list for 4–10 tappable options. */
export async function sendListMessage(
  to: string,
  body: string,
  options: MenuOption[],
  listButtonText: string
): Promise<void> {
  if (options.length === 0 || options.length > 10) {
    throw new Error("List messages support 1–10 options");
  }

  const ok = await sendWhatsAppPayload(to, {
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: body.slice(0, 1024) },
      action: {
        button: listButtonText.slice(0, 20),
        sections: [
          {
            rows: options.map((opt) => ({
              id: opt.id.slice(0, 200),
              title: opt.title.slice(0, 24),
              ...(opt.description ? { description: opt.description.slice(0, 72) } : {}),
            })),
          },
        ],
      },
    },
  });

  if (!ok) {
    throw new Error("WhatsApp list send failed");
  }
}

/** Buttons for ≤3 options, list message otherwise. Falls back to numbered text if send fails. */
export async function sendMenuMessage(
  to: string,
  body: string,
  options: MenuOption[],
  listButtonText: string
): Promise<void> {
  try {
    if (options.length <= 3) {
      await sendButtonMessage(to, body, options);
    } else {
      await sendListMessage(to, body, options, listButtonText);
    }
  } catch (err) {
    console.warn("Interactive menu failed, falling back to text:", err);
    const numbered = options
      .map((opt, i) => `*${opt.id || i + 1}.* ${opt.title}${opt.description ? ` — ${opt.description}` : ""}`)
      .join("\n");
    await sendTextMessage(to, `${body}\n\n${numbered}`);
  }
}

export async function probeWhatsAppSend(
  to: string,
  body = "Casa connectivity test — you can ignore this."
): Promise<{ ok: boolean; status: number; body: unknown }> {
  if (!isWhatsAppConfigured) {
    return { ok: false, status: 0, body: { error: "WhatsApp not configured" } };
  }

  const response = await fetchWithTimeout(
    `${GRAPH_API}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    }
  );

  const parsed = await response.json().catch(async () => response.text());
  return { ok: response.ok, status: response.status, body: parsed };
}

export async function markAsRead(messageId: string): Promise<void> {
  if (!isWhatsAppConfigured) return;

  await fetchWithTimeout(`${GRAPH_API}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    }),
  });
}

export function parseWebhookPayload(body: unknown): IncomingMessage[] {
  const messages: IncomingMessage[] = [];
  if (!body || typeof body !== "object") return messages;

  const payload = body as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
          messages?: Array<Record<string, unknown>>;
        };
      }>;
    }>;
  };

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value?.messages) continue;

      for (const msg of value.messages) {
        const from = String(msg.from ?? "");
        const contact = value.contacts?.find((c) => c.wa_id === from);
        const base = {
          from,
          id: String(msg.id ?? ""),
          timestamp: String(msg.timestamp ?? ""),
          name: contact?.profile?.name,
        };

        if (msg.type === "text" && msg.text && typeof msg.text === "object") {
          const textObj = msg.text as { body?: string };
          messages.push({
            ...base,
            type: "text",
            text: textObj.body ?? "",
          });
        } else if (msg.type === "location" && msg.location) {
          const loc = msg.location as { latitude?: number; longitude?: number };
          messages.push({
            ...base,
            type: "location",
            latitude: loc.latitude,
            longitude: loc.longitude,
          });
        } else if (msg.type === "image" && msg.image) {
          const img = msg.image as { id?: string };
          messages.push({
            ...base,
            type: "image",
            imageId: img.id,
          });
        } else if (msg.type === "audio" && msg.audio) {
          const audio = msg.audio as { id?: string };
          messages.push({
            ...base,
            type: "audio",
            audioId: audio.id,
          });
        } else if (msg.type === "video" && msg.video) {
          const video = msg.video as { id?: string };
          messages.push({
            ...base,
            type: "video",
            videoId: video.id,
          });
        } else if (msg.type === "interactive" && msg.interactive) {
          const interactive = msg.interactive as {
            button_reply?: { id?: string; title?: string };
            list_reply?: { id?: string; title?: string };
          };
          const reply = interactive.button_reply ?? interactive.list_reply;
          const choiceId = reply?.id ?? "";
          const title = reply?.title ?? "";
          messages.push({
            ...base,
            type: "interactive",
            text: choiceId || title,
            choiceId: choiceId || undefined,
          });
        } else if (msg.type === "button" && msg.button) {
          const button = msg.button as { text?: string; payload?: string };
          messages.push({
            ...base,
            type: "button",
            text: button.payload ?? button.text ?? "",
            choiceId: button.payload ?? undefined,
          });
        } else {
          messages.push({ ...base, type: "unknown" });
        }
      }
    }
  }

  return messages;
}
