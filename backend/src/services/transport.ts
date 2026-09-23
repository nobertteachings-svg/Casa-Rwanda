/**
 * Transport abstraction.
 *
 * The existing flow code calls `sendTextMessage`, `sendMenuMessage`, etc.
 * This module re-exports those exact names but routes them through the
 * *active transport* for the current async context:
 *
 *   - WhatsApp transport  → calls Meta Graph API (default; used by webhook)
 *   - App transport       → collects outbound actions into an array (used by /api/app routes)
 *
 * Flows never import directly from `whatsapp.ts` for sending; they import
 * from here instead.  The WhatsApp primitives (sendWhatsAppPayload, etc.)
 * remain in whatsapp.ts.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import * as wa from "./whatsapp.js";

export type { MenuOption, IncomingMessage } from "./whatsapp.js";

// ---------------------------------------------------------------------------
// UI action types – what the mobile app receives
// ---------------------------------------------------------------------------

export type UIAction =
  | { kind: "text"; body: string }
  | { kind: "menu"; body: string; options: wa.MenuOption[]; buttonLabel: string }
  | { kind: "image"; ref: string; caption?: string }
  | { kind: "video"; ref: string; caption?: string };

export interface AppTransportCtx {
  actions: UIAction[];
}

// ---------------------------------------------------------------------------
// AsyncLocalStorage – one context per request/task
// ---------------------------------------------------------------------------

const store = new AsyncLocalStorage<AppTransportCtx | null>();

/**
 * Run `fn` with an App transport context active.
 * Outbound messages are collected into `ctx.actions` instead of being sent
 * to WhatsApp.
 */
export function runWithAppTransport<T>(
  ctx: AppTransportCtx,
  fn: () => Promise<T>
): Promise<T> {
  return store.run(ctx, fn);
}

/** True when we are inside an app-transport context. */
function isAppCtx(): AppTransportCtx | null {
  return store.getStore() ?? null;
}

// ---------------------------------------------------------------------------
// Unified send primitives
// ---------------------------------------------------------------------------

export async function sendTextMessage(to: string, body: string): Promise<void> {
  const ctx = isAppCtx();
  if (ctx) {
    ctx.actions.push({ kind: "text", body });
    return;
  }
  return wa.sendTextMessage(to, body);
}

export async function sendMenuMessage(
  to: string,
  body: string,
  options: wa.MenuOption[],
  listButtonText: string
): Promise<void> {
  const ctx = isAppCtx();
  if (ctx) {
    ctx.actions.push({ kind: "menu", body, options, buttonLabel: listButtonText });
    return;
  }
  return wa.sendMenuMessage(to, body, options, listButtonText);
}

export async function sendButtonMessage(
  to: string,
  body: string,
  options: wa.MenuOption[]
): Promise<void> {
  const ctx = isAppCtx();
  if (ctx) {
    // Buttons are a sub-type of menu for the app
    ctx.actions.push({ kind: "menu", body, options, buttonLabel: "Choose" });
    return;
  }
  return wa.sendButtonMessage(to, body, options);
}

export async function sendListMessage(
  to: string,
  body: string,
  options: wa.MenuOption[],
  listButtonText: string
): Promise<void> {
  const ctx = isAppCtx();
  if (ctx) {
    ctx.actions.push({ kind: "menu", body, options, buttonLabel: listButtonText });
    return;
  }
  return wa.sendListMessage(to, body, options, listButtonText);
}

export async function sendImageMessage(
  to: string,
  mediaId: string,
  caption?: string
): Promise<boolean> {
  const ctx = isAppCtx();
  if (ctx) {
    ctx.actions.push({ kind: "image", ref: `wa-media:${mediaId}`, caption });
    return true;
  }
  return wa.sendImageMessage(to, mediaId, caption);
}

export async function sendVideoMessage(
  to: string,
  mediaId: string,
  caption?: string
): Promise<boolean> {
  const ctx = isAppCtx();
  if (ctx) {
    ctx.actions.push({ kind: "video", ref: `wa-media:${mediaId}`, caption });
    return true;
  }
  return wa.sendVideoMessage(to, mediaId, caption);
}

export async function sendImageLink(
  to: string,
  url: string,
  caption?: string
): Promise<boolean> {
  const ctx = isAppCtx();
  if (ctx) {
    ctx.actions.push({ kind: "image", ref: url, caption });
    return true;
  }
  return wa.sendImageLink(to, url, caption);
}

export async function sendVideoLink(
  to: string,
  url: string,
  caption?: string
): Promise<boolean> {
  const ctx = isAppCtx();
  if (ctx) {
    ctx.actions.push({ kind: "video", ref: url, caption });
    return true;
  }
  return wa.sendVideoLink(to, url, caption);
}

// markAsRead is a no-op in app transport (no read receipts)
export async function markAsRead(messageId: string): Promise<void> {
  const ctx = isAppCtx();
  if (ctx) return;
  return wa.markAsRead(messageId);
}

// Re-export non-transport helpers unchanged
export { parseWebhookPayload, probeWhatsAppSend } from "./whatsapp.js";
