import { Router } from "express";
import { createRateLimiter } from "../middleware/rate-limit.js";
import { validate } from "../middleware/validate.js";
import { publicListingsQuerySchema, publicMediaQuerySchema } from "../schemas/http.js";
import { redis } from "../redis/client.js";
import { logger } from "../lib/logger.js";
import {
  cloudinaryDeliveryUrl,
  cloudinaryMarketingUrl,
  isCloudinaryConfigured,
  persistWhatsAppMedia,
} from "../services/features/cloudinary-media.js";
import { detectImageMediaType, guessMediaMimeType } from "../services/features/media.js";
import { downloadWhatsAppMedia } from "../services/features/voice.js";
import {
  getPublicListings,
  promoteListingMediaRef,
} from "../services/public-listings.js";
import { getPublicStats } from "../services/public-stats.js";

export const publicRouter = Router();

const publicRateLimit = createRateLimiter({
  prefix: "public-api",
  limit: 120,
  windowSec: 60,
});

/** Media is requested many times per page load — keep this generous + cache responses. */
const mediaRateLimit = createRateLimiter({
  prefix: "public-media",
  limit: 600,
  windowSec: 60,
});

const MEDIA_CACHE_TTL_SEC = 60 * 60 * 24; // 24h

publicRouter.get("/stats", publicRateLimit, async (_req, res) => {
  try {
    const stats = await getPublicStats();
    res.setHeader("Cache-Control", "public, max-age=60");
    res.json(stats);
  } catch (err) {
    logger.error("Public stats error", { err: String(err) });
    res.status(500).json({ error: "Failed to load stats" });
  }
});

publicRouter.get(
  "/listings",
  publicRateLimit,
  validate(publicListingsQuerySchema, "query"),
  async (req, res) => {
    try {
      const q = req.query as { limit?: number };
      const limit = Math.min(q.limit ?? 24, 48);
      const data = await getPublicListings(limit);
      res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
      res.json(data);
    } catch (err) {
      logger.error("Public listings error", { err: String(err) });
      res.status(500).json({ error: "Failed to load listings" });
    }
  }
);

publicRouter.get(
  "/media",
  mediaRateLimit,
  validate(publicMediaQuerySchema, "query"),
  async (req, res) => {
    const q = req.query as { ref: string; kind?: "image" | "video" };
    const ref = q.ref;
    const kind = (q.kind === "video" ? "video" : "image") as "image" | "video";

    const optimized = cloudinaryMarketingUrl(ref, kind, "display") ?? cloudinaryDeliveryUrl(ref);
    if (optimized) {
      res.setHeader("Cache-Control", "public, max-age=86400, immutable");
      res.redirect(302, optimized);
      return;
    }

    const match = ref.match(/^wa-media:(.+)$/);
    if (!match) {
      res.status(400).json({ error: "Invalid media ref" });
      return;
    }

    const mediaId = match[1];
    const cacheKey = `casa:public-media:${kind}:${mediaId}`;

    try {
      if (redis.status === "ready") {
        const cached = await redis.getBuffer(cacheKey);
        if (cached && cached.length > 0) {
          const type =
            kind === "video" ? guessMediaMimeType(cached, "video") : detectImageMediaType(cached);
          res.setHeader("Content-Type", type);
          res.setHeader("Cache-Control", "public, max-age=86400");
          res.setHeader("X-Casa-Media-Cache", "hit");
          res.send(cached);
          return;
        }
      }

      // Prefer permanent CDN: download once → Cloudinary → redirect + upgrade DB refs.
      if (isCloudinaryConfigured) {
        const permanent = await persistWhatsAppMedia(mediaId, kind);
        if (permanent.startsWith("cloudinary:")) {
          void promoteListingMediaRef(ref, permanent).catch((err) =>
            logger.warn("Failed to promote media ref", { err: String(err) })
          );
          const cdn =
            cloudinaryMarketingUrl(permanent, kind, "display") ?? cloudinaryDeliveryUrl(permanent);
          if (cdn) {
            res.setHeader("Cache-Control", "public, max-age=86400, immutable");
            res.redirect(302, cdn);
            return;
          }
        }
      }

      const buffer = await downloadWhatsAppMedia(mediaId);
      if (!buffer) {
        res.status(404).json({ error: "Media not found or expired" });
        return;
      }

      if (redis.status === "ready") {
        void redis.set(cacheKey, buffer, "EX", MEDIA_CACHE_TTL_SEC).catch(() => undefined);
      }

      const type =
        kind === "video" ? guessMediaMimeType(buffer, "video") : detectImageMediaType(buffer);

      res.setHeader("Content-Type", type);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("X-Casa-Media-Cache", "miss");
      res.send(buffer);
    } catch (err) {
      logger.error("Public media error", { err: String(err) });
      res.status(500).json({ error: "Failed to load media" });
    }
  }
);
