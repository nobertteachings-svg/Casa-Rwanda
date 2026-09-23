import { Router } from "express";
import { pool } from "../db/pool.js";
import { redis } from "../redis/client.js";
import { env, isWhatsAppConfigured } from "../config/env.js";
import { requireAdmin, safeAdminSecretEqual } from "../middleware/admin-auth.js";
import { createRateLimiter } from "../middleware/rate-limit.js";
import { validate } from "../middleware/validate.js";
import { logger } from "../lib/logger.js";
import {
  adminHousesQuerySchema,
  adminUsersQuerySchema,
  auditLogQuerySchema,
  disputeBodySchema,
  houseStatusBodySchema,
  paymentsQuerySchema,
  rejectIdBodySchema,
  replacePhotosBodySchema,
  searchQuerySchema,
  suspendUserBodySchema,
  testWhatsAppBodySchema,
  unlockFeeBodySchema,
} from "../schemas/http.js";
import { probeWhatsAppSend } from "../services/whatsapp.js";
import { logAdminAction } from "../services/admin/audit.js";
import {
  getDashboardStats,
  listHouses,
  listReviews,
  listUsers,
  resolveReview,
  updateHouseStatus,
} from "../services/admin-stats.js";
import {
  approveManualIdVerification,
  listPendingIdVerifications,
  rejectIdVerification,
} from "../services/features/landlord-id-verification.js";
import { approveVerification } from "../services/features/verification.js";
import { downloadWhatsAppMedia } from "../services/features/voice.js";
import { detectImageMediaType } from "../services/features/media.js";
import { cloudinaryDeliveryUrl } from "../services/features/cloudinary-media.js";
import {
  runAiOnAllPendingVerifications,
  runAiOnVerification,
  reviewListingWithAi,
} from "../services/admin/ai-review.js";
import { findDuplicateListings, getLandlordRisk } from "../services/admin/risk.js";
import { getOpsMetrics } from "../services/admin/ops.js";
import { listAuditLogs } from "../services/admin/audit.js";
import {
  disputeUnlock,
  exportCsv,
  getChartData,
  getHouseDetail,
  getMarketInsights,
  getNavBadges,
  getUnifiedInbox,
  getUnlockFee,
  getUserDetail,
  globalSearch,
  listFailedPayments,
  listPayments,
  setUnlockFee,
  setUserSuspended,
} from "../services/admin/platform.js";
import {
  createAdminSession,
  revokeAdminSession,
} from "../services/admin/sessions.js";
import { getWebhookQueueDepths } from "../services/webhook-queue.js";

export const adminRouter = Router();

const adminLoginLimiter = createRateLimiter({
  prefix: "admin-login",
  limit: 10,
  windowSec: 900,
  failClosed: true,
});

const adminApiLimiter = createRateLimiter({
  prefix: "admin-api",
  limit: 200,
  windowSec: 60,
  keyFn: (req) => req.adminFingerprint ?? req.ip ?? "unknown",
  failClosed: true,
});

adminRouter.post("/session", adminLoginLimiter, async (req, res) => {
  if (!env.ADMIN_API_KEY) {
    res.status(503).json({ error: "Admin API not configured. Set ADMIN_API_KEY in .env" });
    return;
  }

  const apiKey =
    typeof req.body?.apiKey === "string"
      ? req.body.apiKey
      : typeof req.headers.authorization === "string" && req.headers.authorization.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : "";

  if (!apiKey || !safeAdminSecretEqual(apiKey, env.ADMIN_API_KEY)) {
    res.status(401).json({ error: "Invalid API key" });
    return;
  }

  if (redis.status !== "ready") {
    res.status(503).json({ error: "Admin sessions require Redis. Try again shortly." });
    return;
  }

  try {
    const session = await createAdminSession();
    res.json(session);
  } catch (err) {
    logger.error("Admin session create error", { err: String(err) });
    res.status(500).json({ error: "Failed to create session" });
  }
});

const protectedAdmin = Router();
protectedAdmin.use(requireAdmin);
protectedAdmin.use(adminApiLimiter);

protectedAdmin.delete("/session", async (req, res) => {
  if (req.adminSessionToken) {
    await revokeAdminSession(req.adminSessionToken);
  }
  res.json({ ok: true });
});

function fp(req: { adminFingerprint?: string }): string {
  return req.adminFingerprint ?? "unknown";
}

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

protectedAdmin.get("/stats", async (_req, res) => {
  try {
    const [stats, charts, ops, badges] = await Promise.all([
      getDashboardStats(),
      getChartData(),
      getOpsMetrics(),
      getNavBadges(),
    ]);
    const fee = await getUnlockFee();
    stats.revenue.unlockFeeRwf = fee;
    res.json({ ...stats, charts, ops, badges, health: { whatsapp: isWhatsAppConfigured } });
  } catch (err) {
    logger.error("Admin stats error", { err: String(err) });
    res.status(500).json({ error: "Failed to load stats" });
  }
});

protectedAdmin.get("/health-detail", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    await redis.ping();
    const ops = await getOpsMetrics();
    const queue = await getWebhookQueueDepths();
    res.json({ db: "ok", redis: "ok", whatsapp: isWhatsAppConfigured, ops, queue });
  } catch (err) {
    res.status(503).json({ db: "error", redis: "error", message: String(err) });
  }
});

protectedAdmin.post("/test-whatsapp", validate(testWhatsAppBodySchema), async (req, res) => {
  const phone = String(req.body.phone).trim();
  const result = await probeWhatsAppSend(phone);
  res.status(result.ok ? 200 : 502).json(result);
});

protectedAdmin.get("/badges", async (_req, res) => {
  res.json(await getNavBadges());
});

protectedAdmin.get("/search", validate(searchQuerySchema, "query"), async (req, res) => {
  const q = String((req.query as { q?: string }).q ?? "").trim();
  if (!q) {
    res.json({ users: [], houses: [] });
    return;
  }
  res.json(await globalSearch(q));
});

protectedAdmin.get("/users", validate(adminUsersQuerySchema, "query"), async (req, res) => {
  try {
    const q = req.query as {
      page?: number;
      role?: string;
      verified?: string;
      suspended?: string;
    };
    const page = q.page ?? 1;
    const data = await listUsers(page, 20, {
      role: q.role,
      verified: q.verified,
      suspended: q.suspended,
    });
    res.json(data);
  } catch (err) {
    logger.error("Admin users error", { err: String(err) });
    res.status(500).json({ error: "Failed to load users" });
  }
});

protectedAdmin.get("/users/:phone", async (req, res) => {
  const detail = await getUserDetail(req.params.phone);
  if (!detail) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(detail);
});

protectedAdmin.patch("/users/:phone/verify", async (req, res) => {
  await approveVerification(req.params.phone);
  await logAdminAction(fp(req), "user.verify", "user", req.params.phone);
  res.json({ ok: true, phone: req.params.phone, verified: true });
});

protectedAdmin.patch("/users/:phone/suspend", validate(suspendUserBodySchema), async (req, res) => {
  const { suspended, reason } = req.body as { suspended: boolean; reason?: string };
  const phone = paramId(req.params.phone);
  const ok = await setUserSuspended(phone, Boolean(suspended), reason);
  if (!ok) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  await logAdminAction(fp(req), suspended ? "user.suspend" : "user.unsuspend", "user", phone, {
    reason,
  });
  res.json({ ok: true });
});

protectedAdmin.get("/users/:phone/risk", async (req, res) => {
  res.json(await getLandlordRisk(req.params.phone));
});

protectedAdmin.get("/houses", validate(adminHousesQuerySchema, "query"), async (req, res) => {
  try {
    const q = req.query as {
      page?: number;
      status?: string;
      city?: string;
      region?: string;
      rentMin?: number;
      rentMax?: number;
      category?: string;
    };
    const page = q.page ?? 1;
    const data = await listHouses(page, 20, {
      status: q.status,
      city: q.city,
      region: q.region,
      rentMin: q.rentMin,
      rentMax: q.rentMax,
      category: q.category,
    });
    res.json(data);
  } catch (err) {
    logger.error("Admin houses error", { err: String(err) });
    res.status(500).json({ error: "Failed to load houses" });
  }
});

protectedAdmin.get("/houses/:houseId", async (req, res) => {
  const detail = await getHouseDetail(req.params.houseId);
  if (!detail) {
    res.status(404).json({ error: "House not found" });
    return;
  }
  res.json(detail);
});

protectedAdmin.patch("/houses/:houseId/status", validate(houseStatusBodySchema), async (req, res) => {
  const houseId = paramId(req.params.houseId);
  const { status } = req.body as { status: "active" | "inactive" | "flagged" | "under_review" };
  const updated = await updateHouseStatus(houseId, status);
  if (!updated) {
    res.status(404).json({ error: "House not found" });
    return;
  }
  await logAdminAction(fp(req), "house.status", "house", houseId, { status });
  res.json({ ok: true, houseId, status });
});

protectedAdmin.post("/houses/:houseId/ai-review", async (req, res) => {
  const review = await reviewListingWithAi(req.params.houseId);
  await logAdminAction(fp(req), "house.ai_review", "house", req.params.houseId, { ...review });
  res.json(review);
});

protectedAdmin.post("/houses/:houseId/photos/repair", async (req, res) => {
  try {
    const { repairHouseMedia } = await import("../services/public-listings.js");
    const result = await repairHouseMedia(req.params.houseId);
    await logAdminAction(fp(req), "house.photos_repair", "house", req.params.houseId, {
      promoted: result.promoted,
      removed: result.removed,
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(err instanceof Error && err.message === "House not found" ? 404 : 500).json({
      error: err instanceof Error ? err.message : "Repair failed",
    });
  }
});

protectedAdmin.put("/houses/:houseId/photos", validate(replacePhotosBodySchema), async (req, res) => {
  try {
    const houseId = paramId(req.params.houseId);
    const { imageUrls } = req.body as { imageUrls: string[] };
    const { replaceHousePhotosFromUrls } = await import("../services/public-listings.js");
    const photos = await replaceHousePhotosFromUrls(houseId, imageUrls);
    await logAdminAction(fp(req), "house.photos_replace", "house", houseId, {
      count: photos.length,
    });
    res.json({ ok: true, photos });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : "Failed to update photos",
    });
  }
});

protectedAdmin.get("/reviews", async (req, res) => {
  try {
    const resolved = req.query.resolved === "true";
    const reviews = await listReviews(resolved);
    res.json({ reviews });
  } catch (err) {
    logger.error("Admin reviews error", { err: String(err) });
    res.status(500).json({ error: "Failed to load reviews" });
  }
});

protectedAdmin.get("/inbox", async (_req, res) => {
  res.json({ items: await getUnifiedInbox() });
});

protectedAdmin.patch("/reviews/:reviewId/resolve", async (req, res) => {
  const updated = await resolveReview(req.params.reviewId);
  if (!updated) {
    res.status(404).json({ error: "Review not found" });
    return;
  }
  await logAdminAction(fp(req), "review.resolve", "review", req.params.reviewId);
  res.json({ ok: true, reviewId: req.params.reviewId });
});

protectedAdmin.get("/id-verifications", async (_req, res) => {
  try {
    const verifications = await listPendingIdVerifications();
    res.json({ verifications });
  } catch (err) {
    logger.error("Admin ID verifications error", { err: String(err) });
    res.status(500).json({ error: "Failed to load ID verifications" });
  }
});

protectedAdmin.patch("/id-verifications/:id/approve", async (req, res) => {
  const ok = await approveManualIdVerification(req.params.id);
  if (!ok) {
    res.status(404).json({ error: "Verification not found" });
    return;
  }
  await logAdminAction(fp(req), "id.approve", "id_verification", req.params.id);
  res.json({ ok: true, id: req.params.id });
});

protectedAdmin.patch("/id-verifications/:id/reject", validate(rejectIdBodySchema), async (req, res) => {
  const id = paramId(req.params.id);
  const { reason } = req.body as { reason?: string };
  const ok = await rejectIdVerification(id, reason ?? "Rejected by admin");
  if (!ok) {
    res.status(404).json({ error: "Verification not found" });
    return;
  }
  await logAdminAction(fp(req), "id.reject", "id_verification", id, { reason });
  res.json({ ok: true });
});

protectedAdmin.post("/id-verifications/:id/ai-review", async (req, res) => {
  const result = await runAiOnVerification(req.params.id);
  await logAdminAction(fp(req), "id.ai_review", "id_verification", req.params.id, { ...result });
  res.json(result);
});

protectedAdmin.post("/id-verifications/ai-review-all", async (req, res) => {
  const results = await runAiOnAllPendingVerifications();
  await logAdminAction(fp(req), "id.ai_review_all", "batch", "pending", { count: results.length });
  res.json({ results });
});

protectedAdmin.get("/payments", validate(paymentsQuerySchema, "query"), async (req, res) => {
  const q = req.query as {
    page?: number;
    tenant?: string;
    house?: string;
    disputed?: string;
  };
  const page = q.page ?? 1;
  const data = await listPayments(page, 30, {
    tenant: q.tenant,
    house: q.house,
    disputed: q.disputed === "true" ? true : undefined,
  });
  res.json(data);
});

protectedAdmin.get("/payments/failed", async (_req, res) => {
  res.json({ payments: await listFailedPayments() });
});

protectedAdmin.patch("/payments/:id/dispute", validate(disputeBodySchema), async (req, res) => {
  const id = paramId(req.params.id);
  const { reason, flagRefund } = req.body as { reason?: string; flagRefund?: boolean };
  const ok = await disputeUnlock(id, reason ?? "Disputed by admin", Boolean(flagRefund));
  if (!ok) {
    res.status(404).json({ error: "Unlock not found" });
    return;
  }
  await logAdminAction(fp(req), "payment.dispute", "unlock", id, { reason, flagRefund });
  res.json({ ok: true });
});

protectedAdmin.get("/settings", async (_req, res) => {
  res.json({ unlockFeeRwf: await getUnlockFee() });
});

protectedAdmin.patch("/settings/unlock-fee", validate(unlockFeeBodySchema), async (req, res) => {
  const { unlockFeeRwf } = req.body as { unlockFeeRwf: number };
  await setUnlockFee(unlockFeeRwf, fp(req));
  await logAdminAction(fp(req), "settings.unlock_fee", "settings", "unlock_fee_rwf", { unlockFeeRwf });
  res.json({ ok: true, unlockFeeRwf });
});

protectedAdmin.get("/charts", async (_req, res) => {
  res.json(await getChartData());
});

protectedAdmin.get("/insights", async (_req, res) => {
  res.json(await getMarketInsights());
});

protectedAdmin.get("/duplicates", async (_req, res) => {
  res.json({ duplicates: await findDuplicateListings() });
});

protectedAdmin.get("/audit-log", validate(auditLogQuerySchema, "query"), async (req, res) => {
  const limit = (req.query as { limit?: number }).limit ?? 100;
  res.json({ logs: await listAuditLogs(limit) });
});

protectedAdmin.get("/export/:type", async (req, res) => {
  const type = req.params.type as "users" | "houses" | "unlocks";
  if (!["users", "houses", "unlocks"].includes(type)) {
    res.status(400).json({ error: "Invalid export type" });
    return;
  }
  const csv = await exportCsv(type);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="casa-${type}.csv"`);
  res.send(csv);
});

protectedAdmin.get("/media", async (req, res) => {
  const ref = String(req.query.ref ?? "");

  const cloudinaryUrl = cloudinaryDeliveryUrl(ref);
  if (cloudinaryUrl) {
    res.redirect(302, cloudinaryUrl);
    return;
  }

  const match = ref.match(/^wa-media:(.+)$/);
  if (!match) {
    res.status(400).json({ error: "Invalid media ref" });
    return;
  }
  const buffer = await downloadWhatsAppMedia(match[1]);
  if (!buffer) {
    res.status(404).json({ error: "Media not found" });
    return;
  }
  const type = detectImageMediaType(buffer);
  res.setHeader("Content-Type", type);
  res.setHeader("Cache-Control", "private, max-age=3600");
  res.send(buffer);
});

adminRouter.use(protectedAdmin);
