/**
 * /api/app — Mobile app REST endpoints.
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { redis, getSession, setSession } from "../redis/client.js";
import { logger } from "../lib/logger.js";
import { createRateLimiter } from "../middleware/rate-limit.js";
import { findUser, createUser, isUserSuspended, updateUserLanguage } from "../services/users.js";
import { sendAuthenticationOtp, sendTextMessage } from "../services/whatsapp.js";
import {
  APP_OTP_TTL_SEC,
  appLoginWhatsAppUrl,
  generateOTP,
  loginOtpMessage,
  otpKey,
} from "../services/app-otp.js";
import { upsertDeviceToken, deactivateAllDeviceTokens } from "../services/device-tokens.js";
import { runWithAppTransport, type UIAction } from "../services/transport.js";
import { routeMessage } from "../flows/router.js";
import {
  isCloudinaryConfigured,
  uploadImageBuffer,
  uploadVideoBuffer,
} from "../services/features/cloudinary-media.js";
import { getPublicListings } from "../services/public-listings.js";
import { parseAppSearchQuery, searchListingsForApp } from "../services/listing-search.js";
import { findHouseById, findHousesByLandlord, updateHouseByLandlord, updateHouseStatusByLandlord } from "../services/houses.js";
import {
  houseToLandlordSummary,
  resolveListingDetailForViewer,
} from "../services/listing-detail.js";
import { startLandlordIdVerification } from "../flows/landlord-verify-id.js";
import { isLandlordVerified } from "../services/features/landlord-id-verification.js";
import { getUnlockHistory } from "../services/features/unlocks.js";
import { recordListingView } from "../services/features/views.js";
import {
  appTenantRouter,
  buildTenantProfile,
  handleAppUnlock,
} from "./app-tenant.js";
import { appLandlordRouter } from "./app-landlord.js";
import {
  appReviewOtpForPhone,
  isAppReviewBypass,
  isAppReviewPhone,
} from "../services/app-review-auth.js";
import type { Language, UserRole } from "../i18n/messages.js";

export const appRouter = Router();

const JWT_SECRET = env.APP_JWT_SECRET ?? "casa-app-dev-secret-change-in-production";
const JWT_EXPIRY = "30d";
const OTP_TTL = APP_OTP_TTL_SEC;
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

const otpRequestLimiter = createRateLimiter({
  prefix: "app-otp-req",
  limit: 5,
  windowSec: 900,
  failClosed: false,
});

const otpVerifyLimiter = createRateLimiter({
  prefix: "app-otp-verify",
  limit: 10,
  windowSec: 900,
  failClosed: false,
});

const appApiLimiter = createRateLimiter({
  prefix: "app-api",
  limit: 120,
  windowSec: 60,
  failClosed: false,
});

const uploadLimiter = createRateLimiter({
  prefix: "app-upload",
  limit: 30,
  windowSec: 900,
  failClosed: false,
});

function signToken(phone: string): string {
  return jwt.sign({ phone, iat: Math.floor(Date.now() / 1000) }, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
  });
}

function verifyToken(token: string): { phone: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (typeof payload === "object" && "phone" in payload) {
      return { phone: payload.phone as string };
    }
    return null;
  } catch {
    return null;
  }
}

function extractBearer(req: Request): string | null {
  const h = req.headers.authorization;
  if (h?.startsWith("Bearer ")) return h.slice(7);
  return null;
}

interface AppRequest extends Request {
  appPhone?: string;
}

async function requireAppAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractBearer(req);
  if (!token) {
    res.status(401).json({ error: "Missing Bearer token" });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  (req as AppRequest).appPhone = payload.phone;
  next();
}

function optionalAppAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearer(req);
  if (token) {
    const payload = verifyToken(token);
    if (payload) (req as AppRequest).appPhone = payload.phone;
  }
  next();
}

function parseAppLanguage(_raw: unknown): Language {
  return "en";
}

async function userPayload(user: Awaited<ReturnType<typeof findUser>>) {
  if (!user) return null;
  const base = {
    phone: user.phone,
    role: user.role,
    language: "en" as const,
    display_name: user.display_name,
  };
  if (user.role === "landlord") {
    return { ...base, landlordVerified: await isLandlordVerified(user.phone) };
  }
  return { ...base, ...(await buildTenantProfile(user.phone)) };
}

function sessionPayload(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session) return null;
  return {
    flow: session.flow,
    step: session.step,
    language: "en",
    data: session.data ?? {},
  };
}

// ---------------------------------------------------------------------------
// POST /api/app/auth/request-code
// ---------------------------------------------------------------------------

appRouter.post("/auth/request-code", otpRequestLimiter, async (req: Request, res: Response) => {
  const rawPhone = String(req.body?.phone ?? "").replace(/\D/g, "");
  if (!rawPhone || rawPhone.length < 7) {
    res.status(400).json({ error: "Valid phone number required" });
    return;
  }

  const lang = parseAppLanguage(req.body?.language) ?? "en";
  const existing = isAppReviewPhone(rawPhone) ? null : await findUser(rawPhone);
  if (existing) {
    if (await isUserSuspended(rawPhone)) {
      res.status(403).json({
        error:
          lang === "fr"
            ? "Ce compte Casa est temporairement suspendu."
            : "This Casa account is temporarily suspended.",
      });
      return;
    }
    const token = signToken(rawPhone);
    logger.info("App login without OTP", { phone: rawPhone });
    res.json({
      ok: true,
      delivery: "existing_user",
      expiresIn: OTP_TTL,
      token,
      needsSignup: false,
      user: await userPayload(existing),
    });
    return;
  }

  const reviewOtp = appReviewOtpForPhone(rawPhone);
  const otp = reviewOtp ?? generateOTP();

  try {
    await redis.set(otpKey(rawPhone), otp, "EX", OTP_TTL);
  } catch (err) {
    logger.error("OTP store failed", { err: String(err) });
    res.status(503).json({ error: "Service unavailable, try again shortly" });
    return;
  }

  const otpLang = lang === "fr" ? "fr" : "en";
  const whatsappUrl = appLoginWhatsAppUrl(otpLang);
  let delivery: "whatsapp_template" | "whatsapp_click" | "review_bypass" = "whatsapp_click";

  if (isAppReviewPhone(rawPhone)) {
    delivery = "review_bypass";
  } else {
    const templated = await sendAuthenticationOtp(rawPhone, otp, otpLang, { discover: false });
    if (templated) {
      delivery = "whatsapp_template";
    } else {
      // Best-effort session text for people who already wrote Casa.
      // New users still need the click-to-chat URL — Meta drops silent text.
      try {
        await sendTextMessage(rawPhone, loginOtpMessage(otp, otpLang));
      } catch {
        /* expected for first-time users */
      }
      delivery = "whatsapp_click";
      logger.info("OTP template unavailable; returning WhatsApp click-to-chat", { phone: rawPhone });
    }
  }

  logger.info("App OTP stored", { phone: rawPhone, delivery });
  res.json({ ok: true, expiresIn: OTP_TTL, delivery, whatsappUrl });
});

// ---------------------------------------------------------------------------
// POST /api/app/auth/verify-code — new + existing users
// ---------------------------------------------------------------------------

appRouter.post("/auth/verify-code", otpVerifyLimiter, async (req: Request, res: Response) => {
  const rawPhone = String(req.body?.phone ?? "").replace(/\D/g, "");
  const code = String(req.body?.code ?? "").trim();

  if (!rawPhone || !code) {
    res.status(400).json({ error: "phone and code required" });
    return;
  }

  const reviewBypass = isAppReviewBypass(rawPhone, code);

  if (!reviewBypass) {
    let stored: string | null = null;
    try {
      stored = await redis.get(otpKey(rawPhone));
    } catch (err) {
      logger.error("OTP fetch failed", { err: String(err) });
      res.status(503).json({ error: "Service unavailable" });
      return;
    }

    if (!stored) {
      res.status(401).json({ error: "Code expired or not requested" });
      return;
    }

    if (stored !== code) {
      res.status(401).json({ error: "Incorrect code" });
      return;
    }

    await redis.del(otpKey(rawPhone)).catch(() => undefined);
  }

  const user = await findUser(rawPhone);
  const token = signToken(rawPhone);
  logger.info("App login success", { phone: rawPhone, newUser: !user });

  res.json({
    token,
    expiresIn: JWT_EXPIRY,
    needsSignup: !user,
    user: await userPayload(user),
  });
});

// ---------------------------------------------------------------------------
// GET /api/app/me
// ---------------------------------------------------------------------------

appRouter.get("/me", appApiLimiter, requireAppAuth, async (req: Request, res: Response) => {
  const phone = (req as AppRequest).appPhone!;
  const user = await findUser(phone);
  const session = await getSession(phone);
  res.json({
    needsSignup: !user,
    user: await userPayload(user),
    session: sessionPayload(session),
  });
});

// ---------------------------------------------------------------------------
// POST /api/app/register — in-app signup (no chat)
// ---------------------------------------------------------------------------

appRouter.post("/register", appApiLimiter, requireAppAuth, async (req: Request, res: Response) => {
  const phone = (req as AppRequest).appPhone!;
  const existing = await findUser(phone);
  if (existing) {
    res.status(400).json({ error: "Already registered" });
    return;
  }

  const roleRaw = String(req.body?.role ?? "");
  const role: UserRole = roleRaw === "landlord" ? "landlord" : "tenant";
  const language = "en" as const;
  const referrer =
    typeof req.body?.referrer === "string"
      ? req.body.referrer.replace(/\D/g, "")
      : undefined;

  await createUser(phone, role, language);

  if (referrer && referrer.length >= 8) {
    const { createReferral } = await import("../services/features/referrals.js");
    await createReferral(referrer, phone).catch(() => undefined);
  }

  await setSession(phone, {
    flow: "main_menu",
    step: "idle",
    language,
    data: { role },
  });

  const user = await findUser(phone);
  res.json({ ok: true, user: await userPayload(user), needsSignup: false });
});

// ---------------------------------------------------------------------------
// GET /api/app/unlocked — tenant unlock history
// ---------------------------------------------------------------------------

appRouter.get("/unlocked", appApiLimiter, requireAppAuth, async (req: Request, res: Response) => {
  const phone = (req as AppRequest).appPhone!;
  const user = await findUser(phone);
  if (!user || user.role !== "tenant") {
    res.status(403).json({ error: "Tenants only" });
    return;
  }
  const rows = await getUnlockHistory(phone);
  res.json({
    contacts: rows.map((r) => ({
      houseId: r.house_id,
      landlordPhone: r.landlord_phone ?? r.beneficiary_phone ?? "",
      rent: r.rent ?? 0,
      neighbourhood: r.neighbourhood ?? null,
      unlockedAt: r.paid_at,
    })),
  });
});

// ---------------------------------------------------------------------------
// POST /api/app/session/bootstrap — pre-set language for signup or refresh session
// ---------------------------------------------------------------------------

appRouter.post("/session/bootstrap", appApiLimiter, requireAppAuth, async (req: Request, res: Response) => {
  const phone = (req as AppRequest).appPhone!;
  const language = parseAppLanguage(req.body?.language);
  const user = await findUser(phone);
  const existing = await getSession(phone);

  if (user) {
    if (language) {
      await updateUserLanguage(phone, language);
    }
    const lang = language ?? user.language;
    await setSession(phone, {
      flow: existing?.flow ?? "main_menu",
      step: existing?.step ?? "idle",
      language: lang,
      data: { role: user.role, ...(existing?.data ?? {}) },
    });
    const updated = await findUser(phone);
    res.json({ ok: true, needsSignup: false, language: lang, user: await userPayload(updated) });
    return;
  }

  if (!language) {
    res.json({ ok: true, needsSignup: true, language: existing?.language ?? null });
    return;
  }

  await setSession(phone, {
    flow: "registration",
    step: "role",
    language,
    data: existing?.data ?? {},
  });

  res.json({ ok: true, needsSignup: true, language });
});

// ---------------------------------------------------------------------------
// PATCH /api/app/language — change language without chat menu
// ---------------------------------------------------------------------------

appRouter.patch("/language", appApiLimiter, requireAppAuth, async (req: Request, res: Response) => {
  const phone = (req as AppRequest).appPhone!;
  const language = parseAppLanguage(req.body?.language);
  if (!language) {
    res.status(400).json({ error: "language must be en or fr" });
    return;
  }

  const user = await findUser(phone);
  if (user) {
    await updateUserLanguage(phone, language);
  }

  const session = await getSession(phone);
  await setSession(phone, {
    flow: session?.flow ?? (user ? "main_menu" : "registration"),
    step: session?.step ?? (user ? "idle" : "role"),
    language,
    data: session?.data ?? (user ? { role: user.role } : {}),
  });

  const updated = await findUser(phone);
  res.json({
    ok: true,
    language,
    needsSignup: !updated,
    user: await userPayload(updated),
  });
});

// ---------------------------------------------------------------------------
// POST /api/app/device-token — register Expo push token
// ---------------------------------------------------------------------------

appRouter.post("/device-token", appApiLimiter, requireAppAuth, async (req: Request, res: Response) => {
  const phone = (req as AppRequest).appPhone!;
  const expoPushToken = String(req.body?.expoPushToken ?? "").trim();
  if (!expoPushToken.startsWith("ExponentPushToken")) {
    res.status(400).json({ error: "Valid expoPushToken required" });
    return;
  }
  await upsertDeviceToken(phone, expoPushToken, String(req.body?.platform ?? ""));
  res.json({ ok: true });
});

appRouter.delete("/device-token", appApiLimiter, requireAppAuth, async (req: Request, res: Response) => {
  const phone = (req as AppRequest).appPhone!;
  await deactivateAllDeviceTokens(phone);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// POST /api/app/upload — base64 image/video from mobile camera
// ---------------------------------------------------------------------------

appRouter.post("/upload", uploadLimiter, requireAppAuth, async (req: Request, res: Response) => {
  const kind = String(req.body?.kind ?? "image") === "video" ? "video" : "image";
  const raw = String(req.body?.data ?? "");
  const comma = raw.lastIndexOf(",");
  const data = comma >= 0 && raw.slice(0, comma).includes("base64") ? raw.slice(comma + 1) : raw;
  if (!data) {
    res.status(400).json({ error: "data (base64) required" });
    return;
  }
  if (!isCloudinaryConfigured) {
    res.status(503).json({ error: "Media upload not configured on server" });
    return;
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(data, "base64");
  } catch {
    res.status(400).json({ error: "Invalid base64 data" });
    return;
  }

  if (buffer.length === 0 || buffer.length > MAX_UPLOAD_BYTES) {
    res.status(400).json({ error: "File too large or empty" });
    return;
  }

  try {
    const ref =
      kind === "video" ? await uploadVideoBuffer(buffer) : await uploadImageBuffer(buffer);
    res.json({ ok: true, ref, kind });
  } catch (err) {
    logger.error("App upload failed", { err: String(err) });
    res.status(500).json({ error: "Upload failed" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/app/search — GPS or manual tenant search (map + filters)
// ---------------------------------------------------------------------------

appRouter.get("/search", appApiLimiter, async (req: Request, res: Response) => {
  try {
    const params = parseAppSearchQuery(req.query as Record<string, unknown>);
    const data = await searchListingsForApp(params);
    res.setHeader("Cache-Control", "private, max-age=30");
    res.json({ ...data, updatedAt: new Date().toISOString() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Search failed";
    const status = /required|provide at least/i.test(msg) ? 400 : 500;
    if (status === 500) {
      logger.error("App search error", { err: String(err) });
    }
    res.status(status).json({ error: msg });
  }
});

// ---------------------------------------------------------------------------
// GET /api/app/listings — browse cards (recent)
// ---------------------------------------------------------------------------

appRouter.get("/listings", appApiLimiter, async (req: Request, res: Response) => {
  const limit = Math.min(48, Math.max(1, parseInt(String(req.query.limit ?? "24"), 10) || 24));
  try {
    const data = await getPublicListings(limit);
    res.setHeader("Cache-Control", "public, max-age=60");
    res.json(data);
  } catch (err) {
    logger.error("App listings error", { err: String(err) });
    res.status(500).json({ error: "Failed to load listings" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/app/listings/:houseId/unlock
// ---------------------------------------------------------------------------

appRouter.get(
  "/listings/:houseId/unlock-quote",
  appApiLimiter,
  requireAppAuth,
  async (req: Request, res: Response) => {
    const phone = (req as AppRequest).appPhone!;
    const user = await findUser(phone);
    if (!user || user.role !== "tenant") {
      res.status(403).json({ error: "Tenants only" });
      return;
    }
    const houseId = String(req.params.houseId ?? "").toUpperCase();
    const { getUnlockQuote, momoPaymentInstructions } = await import("../services/app-unlock.js");
    const house = await findHouseById(houseId);
    if (!house || house.status !== "active") {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const lang = (user.language ?? "en") as Language;
    const quote = await getUnlockQuote(phone, house);
    res.json({
      quote,
      paymentInstructions: quote.paymentsEnabled
        ? momoPaymentInstructions(houseId, quote.unlockFeeRwf, lang)
        : null,
    });
  }
);

appRouter.post(
  "/listings/:houseId/unlock",
  appApiLimiter,
  requireAppAuth,
  async (req: Request, res: Response) => {
    const phone = (req as AppRequest).appPhone!;
    const houseId = String(req.params.houseId ?? "").toUpperCase();
    const body = (req.body ?? {}) as { confirmPaid?: boolean; beneficiaryPhone?: string };
    const result = await handleAppUnlock(phone, houseId, body);
    res.status(result.status).json(result.body);
  }
);

// ---------------------------------------------------------------------------
// GET /api/app/listings/:houseId — full listing detail
// ---------------------------------------------------------------------------

appRouter.get(
  "/listings/:houseId",
  appApiLimiter,
  optionalAppAuth,
  async (req: Request, res: Response) => {
    const phone = (req as AppRequest).appPhone ?? "";
    const houseId = String(req.params.houseId ?? "").toUpperCase();
    const user = phone ? await findUser(phone) : null;
    const house = await findHouseById(houseId);
    if (!house) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    if (house.status !== "active" && house.landlord_phone !== phone) {
      res.status(404).json({ error: "Listing not available" });
      return;
    }
    const detail = await resolveListingDetailForViewer(
      house,
      phone,
      user?.role,
      (user?.language as "en" | "fr") ?? "en"
    );
    if (!detail) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    res.json({ listing: detail });
  }
);

// ---------------------------------------------------------------------------
// GET /api/app/my-listings — landlord properties
// ---------------------------------------------------------------------------

appRouter.get("/my-listings", appApiLimiter, requireAppAuth, async (req: Request, res: Response) => {
  const phone = (req as AppRequest).appPhone!;
  const user = await findUser(phone);
  if (!user) {
    res.status(403).json({ error: "Complete signup first" });
    return;
  }
  if (user.role !== "landlord") {
    res.status(403).json({ error: "Landlords only" });
    return;
  }
  const houses = await findHousesByLandlord(phone);
  res.json({
    listings: houses.map((h) =>
      houseToLandlordSummary(h, (user.language as "en" | "fr") ?? "en")
    ),
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/app/listings/:houseId — landlord edit
// ---------------------------------------------------------------------------

appRouter.patch(
  "/listings/:houseId",
  appApiLimiter,
  requireAppAuth,
  async (req: Request, res: Response) => {
    const phone = (req as AppRequest).appPhone!;
    const houseId = String(req.params.houseId ?? "").toUpperCase();
    const user = await findUser(phone);
    if (!user || user.role !== "landlord") {
      res.status(403).json({ error: "Landlords only" });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const updated = await updateHouseByLandlord(houseId, phone, {
      rent: body.rent !== undefined ? Number(body.rent) : undefined,
      months_upfront: body.monthsUpfront !== undefined ? Number(body.monthsUpfront) : undefined,
      neighbourhood: typeof body.neighbourhood === "string" ? body.neighbourhood.trim() : undefined,
      town: typeof body.town === "string" ? body.town.trim() : undefined,
      water: body.water !== undefined ? Boolean(body.water) : undefined,
      parking: body.parking !== undefined ? Boolean(body.parking) : undefined,
      fenced: body.fenced !== undefined ? Boolean(body.fenced) : undefined,
      borehole: body.borehole !== undefined ? Boolean(body.borehole) : undefined,
      furnished: body.furnished !== undefined ? Boolean(body.furnished) : undefined,
      security: body.security !== undefined ? Boolean(body.security) : undefined,
      standby_generator:
        body.standbyGenerator !== undefined ? Boolean(body.standbyGenerator) : undefined,
      photos_add: Array.isArray(body.photosAdd)
        ? body.photosAdd.filter((x): x is string => typeof x === "string")
        : undefined,
      videos_add: Array.isArray(body.videosAdd)
        ? body.videosAdd.filter((x): x is string => typeof x === "string")
        : undefined,
    });
    if (!updated) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const listing = await resolveListingDetailForViewer(
      updated,
      phone,
      user.role,
      (user.language as "en" | "fr") ?? "en"
    );
    res.json({ ok: true, listing });
  }
);

// ---------------------------------------------------------------------------
// POST /api/app/listings/:houseId/status — mark rented / reactivate
// ---------------------------------------------------------------------------

appRouter.post(
  "/listings/:houseId/status",
  appApiLimiter,
  requireAppAuth,
  async (req: Request, res: Response) => {
    const phone = (req as AppRequest).appPhone!;
    const houseId = String(req.params.houseId ?? "").toUpperCase();
    const status = String(req.body?.status ?? "") === "active" ? "active" : "inactive";
    const user = await findUser(phone);
    if (!user || user.role !== "landlord") {
      res.status(403).json({ error: "Landlords only" });
      return;
    }
    const ok = await updateHouseStatusByLandlord(houseId, phone, status);
    if (!ok) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    const house = await findHouseById(houseId);
    const listing = house
      ? await resolveListingDetailForViewer(
          house,
          phone,
          user.role,
          (user.language as "en" | "fr") ?? "en"
        )
      : null;
    res.json({ ok: true, listing });
  }
);

// ---------------------------------------------------------------------------
// DELETE /api/app/listings/:houseId — remove from search
// ---------------------------------------------------------------------------

appRouter.delete(
  "/listings/:houseId",
  appApiLimiter,
  requireAppAuth,
  async (req: Request, res: Response) => {
    const phone = (req as AppRequest).appPhone!;
    const houseId = String(req.params.houseId ?? "").toUpperCase();
    const user = await findUser(phone);
    if (!user || user.role !== "landlord") {
      res.status(403).json({ error: "Landlords only" });
      return;
    }
    const ok = await updateHouseStatusByLandlord(houseId, phone, "inactive");
    if (!ok) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }
    res.json({ ok: true });
  }
);

// ---------------------------------------------------------------------------
// POST /api/app/verify-id/start — landlord ID verification (app chat)
// ---------------------------------------------------------------------------

appRouter.post("/verify-id/start", appApiLimiter, requireAppAuth, async (req: Request, res: Response) => {
  const phone = (req as AppRequest).appPhone!;
  const user = await findUser(phone);
  if (!user || user.role !== "landlord") {
    res.status(403).json({ error: "Landlords only" });
    return;
  }

  const ctx = { actions: [] as UIAction[] };
  try {
    await runWithAppTransport(ctx, () => startLandlordIdVerification(phone, user.language));
  } catch (err) {
    logger.error("App verify-id start error", { err: String(err), phone });
    res.status(500).json({ error: "Could not start verification" });
    return;
  }

  const session = await getSession(phone);
  res.json({
    ok: true,
    actions: ctx.actions,
    user: await userPayload(user),
    session: sessionPayload(session),
  });
});

// ---------------------------------------------------------------------------
// POST /api/app/message
// ---------------------------------------------------------------------------

appRouter.post("/message", appApiLimiter, requireAppAuth, async (req: Request, res: Response) => {
  const phone = (req as AppRequest).appPhone!;
  const body = (req.body ?? {}) as Record<string, unknown>;
  const text = String(body.text ?? "");
  const type = String(body.type ?? "text");
  const latitude = body.latitude;
  const longitude = body.longitude;
  const mediaRef = typeof body.mediaRef === "string" ? body.mediaRef : undefined;
  const mediaKind = body.mediaKind === "video" ? "video" : "image";

  const ctx = { actions: [] as UIAction[] };

  let msgType: "text" | "location" | "image" | "video" | "audio" = "text";
  if (latitude !== undefined && longitude !== undefined) msgType = "location";
  else if (mediaRef) msgType = mediaKind === "video" ? "video" : "image";
  else if (type === "image") msgType = "image";
  else if (type === "video") msgType = "video";
  else if (type === "audio") msgType = "audio";

  try {
    await runWithAppTransport(ctx, () =>
      routeMessage({
        from: phone,
        id: `app-${Date.now()}`,
        timestamp: String(Math.floor(Date.now() / 1000)),
        type: msgType,
        text,
        mediaRef,
        latitude: latitude !== undefined ? Number(latitude) : undefined,
        longitude: longitude !== undefined ? Number(longitude) : undefined,
      })
    );
  } catch (err) {
    logger.error("App message routing error", { err: String(err), phone });
    res.status(500).json({ error: "Message processing failed" });
    return;
  }

  const session = await getSession(phone);
  const user = await findUser(phone);

  res.json({
    actions: ctx.actions,
    needsSignup: !user,
    user: await userPayload(user),
    session: sessionPayload(session),
  });
});

// Tenant power features (shortlist, alerts, market, diaspora, flag, etc.)
appRouter.use(appApiLimiter, requireAppAuth, appTenantRouter);

// Landlord extras (stats, bulk, trends)
appRouter.use("/landlord", appApiLimiter, requireAppAuth, appLandlordRouter);
