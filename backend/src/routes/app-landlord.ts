/**
 * Landlord extras for /api/app
 */

import { Router, type Request, type Response } from "express";
import { findUser } from "../services/users.js";
import { findHouseById, findHousesByLandlord } from "../services/houses.js";
import { getLandlordWeeklyDigest, getListingStats } from "../services/features/views.js";
import { bulkUpdateListingStatus } from "../services/features/listing-bulk.js";
import { getMarketTrendsJson } from "../services/features/market-intel.js";
import { generateRentalAgreement } from "../services/claude.js";
import { getUnlocksForLandlord } from "../services/features/unlocks.js";
import { formatLocation } from "../services/public-listings.js";
import type { Language } from "../i18n/messages.js";

export const appLandlordRouter = Router();

interface AppRequest extends Request {
  appPhone?: string;
}

async function requireLandlord(req: Request, res: Response): Promise<string | null> {
  const phone = (req as AppRequest).appPhone!;
  const user = await findUser(phone);
  if (!user || user.role !== "landlord") {
    res.status(403).json({ error: "Landlords only" });
    return null;
  }
  return phone;
}

appLandlordRouter.get("/interest", async (req: Request, res: Response) => {
  const phone = await requireLandlord(req, res);
  if (!phone) return;
  const rows = await getUnlocksForLandlord(phone);
  const houses = await findHousesByLandlord(phone);
  const byId = new Map(houses.map((h) => [h.house_id, h]));
  res.json({
    items: rows.map((r) => {
      const house = byId.get(r.house_id);
      return {
        id: r.id,
        tenantPhone: r.tenant_phone,
        houseId: r.house_id,
        rent: r.rent ?? house?.rent ?? 0,
        location: house
          ? formatLocation(house.neighbourhood, house.city ?? null, house.town ?? null)
          : (r.neighbourhood ?? ""),
        unlockedAt: r.paid_at,
      };
    }),
  });
});

appLandlordRouter.get("/stats", async (req: Request, res: Response) => {
  const phone = await requireLandlord(req, res);
  if (!phone) return;
  const digest = await getLandlordWeeklyDigest(phone);
  res.json({ listings: digest, periodDays: 7 });
});

appLandlordRouter.get("/listings/:houseId/stats", async (req: Request, res: Response) => {
  const phone = await requireLandlord(req, res);
  if (!phone) return;
  const houseId = String(req.params.houseId ?? "").toUpperCase();
  const stats = await getListingStats(houseId, 7);
  res.json({ houseId, ...stats, periodDays: 7 });
});

appLandlordRouter.post("/bulk-status", async (req: Request, res: Response) => {
  const phone = await requireLandlord(req, res);
  if (!phone) return;
  const activate = req.body?.status === "active";
  const count = await bulkUpdateListingStatus(phone, activate ? "active" : "inactive");
  res.json({ ok: true, updated: count, status: activate ? "active" : "inactive" });
});

appLandlordRouter.get("/market-trends", async (_req: Request, res: Response) => {
  const trends = await getMarketTrendsJson();
  res.json({ trends });
});

appLandlordRouter.get("/listings/:houseId/lease", async (req: Request, res: Response) => {
  const phone = await requireLandlord(req, res);
  if (!phone) return;
  const houseId = String(req.params.houseId ?? "").toUpperCase();
  const house = await findHouseById(houseId);
  if (!house || house.landlord_phone !== phone) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }
  const user = await findUser(phone);
  const lang = (user?.language ?? "en") as Language;
  const agreement = await generateRentalAgreement(house, "TENANT-TBD", lang);
  res.json({ agreement, format: "text" });
});
