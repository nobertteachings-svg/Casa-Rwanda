/**
 * Tenant & market REST endpoints for /api/app
 */

import { Router, type Request, type Response } from "express";
import { isPaymentsEnabled } from "../config/env.js";
import { electricityMeterLabel } from "../constants/property-taxonomy.js";
import type { Language } from "../i18n/messages.js";
import { getSession, setSession } from "../redis/client.js";
import { findUser } from "../services/users.js";
import { findHouseById } from "../services/houses.js";
import { formatLocation, resolvePublicThumbUrl } from "../services/public-listings.js";
import { resolveListingDetailForViewer } from "../services/listing-detail.js";
import {
  executeAppUnlock,
  getUnlockQuote,
  momoPaymentInstructions,
} from "../services/app-unlock.js";
import { addToShortlist, getShortlist } from "../services/features/shortlist.js";
import { removeFromShortlist } from "../services/features/shortlist-extra.js";
import {
  createSavedSearch,
  listSavedSearches,
} from "../services/features/saved-searches.js";
import { deactivateSavedSearch } from "../services/features/shortlist-extra.js";
import { flagListing, reportListingAlreadyRented } from "../services/features/community-flag.js";
import { buildConciergeContent } from "../services/features/concierge.js";
import { hasUnlocked } from "../services/features/unlocks.js";
import { compareHouses, generateRentalAgreement, type ParsedSearch } from "../services/claude.js";
import { formatResidentialTypeLabel } from "../constants/property-taxonomy.js";
import { requestVerification, isVerified } from "../services/features/verification.js";
import { buildReferralInviteMessage } from "../services/features/referral-invite.js";
import { getRentHeatMapJson, getMarketTrendsJson } from "../services/features/market-intel.js";
import { getAvailableCredits } from "../services/features/referrals.js";
import { checkUnlockAllowed } from "../services/features/unlock-limits.js";
import { getUnlockFee } from "../services/admin/platform.js";
import { recordListingView } from "../services/features/views.js";

export const appTenantRouter = Router();

interface AppRequest extends Request {
  appPhone?: string;
}

async function requireTenant(req: Request, res: Response): Promise<string | null> {
  const phone = (req as AppRequest).appPhone!;
  const user = await findUser(phone);
  if (!user) {
    res.status(403).json({ error: "Complete signup first" });
    return null;
  }
  if (user.role !== "tenant") {
    res.status(403).json({ error: "Tenants only" });
    return null;
  }
  return phone;
}

export async function buildTenantProfile(phone: string) {
  const session = await getSession(phone);
  return {
    tenantVerified: await isVerified(phone),
    paymentsEnabled: isPaymentsEnabled,
    unlockFeeRwf: isPaymentsEnabled ? await getUnlockFee() : 0,
    creditsAvailable: isPaymentsEnabled ? await getAvailableCredits(phone) : 0,
    unlockLimit: await checkUnlockAllowed(phone),
    beneficiaryPhone:
      typeof session?.data?.beneficiary_phone === "string"
        ? session.data.beneficiary_phone
        : null,
  };
}

function shortlistItem(house: Awaited<ReturnType<typeof findHouseById>>, lang: Language = "en") {
  if (!house) return null;
  const thumb = house.photos?.[0];
  return {
    houseId: house.house_id,
    type: formatResidentialTypeLabel(house, lang),
    rent: house.rent,
    location: formatLocation(house.neighbourhood, house.city ?? null, house.town ?? null),
    trustTier: house.trust_tier ?? "standard",
    listedAt: house.created_at.toISOString(),
    thumbUrl: thumb ? resolvePublicThumbUrl(thumb, "image") ?? undefined : undefined,
    monthsUpfront: house.months_upfront,
  };
}

function compareRow(house: NonNullable<Awaited<ReturnType<typeof findHouseById>>>) {
  return {
    houseId: house.house_id,
    type: house.type,
    rent: house.rent,
    monthsUpfront: house.months_upfront,
    location: formatLocation(house.neighbourhood, house.city ?? null, house.town ?? null),
    amenities: {
      water: house.water,
      parking: house.parking,
      fenced: house.fenced,
      borehole: house.borehole,
      furnished: house.furnished,
      security: house.security,
      standbyGenerator: house.standby_generator,
    },
    trustTier: house.trust_tier ?? "standard",
  };
}

appTenantRouter.get("/shortlist", async (req: Request, res: Response) => {
  const phone = await requireTenant(req, res);
  if (!phone) return;
  const user = await findUser(phone);
  const lang = (user?.language ?? "en") as Language;
  const houses = await getShortlist(phone);
  res.json({ items: houses.map((h) => shortlistItem(h, lang)).filter(Boolean) });
});

appTenantRouter.post("/shortlist/compare", async (req: Request, res: Response) => {
  const phone = await requireTenant(req, res);
  if (!phone) return;
  const user = await findUser(phone);
  const lang = (user?.language ?? "en") as Language;
  const houses = await getShortlist(phone);
  if (houses.length < 2) {
    res.status(400).json({ error: "Save at least 2 listings to compare" });
    return;
  }
  const listings = houses.map(compareRow);
  const useAi = req.body?.ai === true || req.query.ai === "1";
  if (!useAi) {
    res.json({ listings });
    return;
  }
  const comparison = await compareHouses(
    houses.map((h) => ({
      house_id: h.house_id,
      type: formatResidentialTypeLabel(h, lang),
      rent: h.rent,
      facilities: [
        h.water && "water",
        h.parking && "parking",
        h.electricity_meter && h.electricity_meter !== "none"
          ? electricityMeterLabel(h.electricity_meter, lang)
          : h.electricity
            ? "electricity"
            : null,
      ]
        .filter(Boolean)
        .join(", "),
    })),
    lang
  );
  res.json({ listings, comparison });
});

appTenantRouter.post("/shortlist/:houseId", async (req: Request, res: Response) => {
  const phone = await requireTenant(req, res);
  if (!phone) return;
  const houseId = String(req.params.houseId ?? "").toUpperCase();
  const house = await findHouseById(houseId);
  if (!house || house.status !== "active") {
    res.status(404).json({ error: "Listing not found" });
    return;
  }
  const count = await addToShortlist(phone, houseId);
  res.json({ ok: true, count, max: 3 });
});

appTenantRouter.delete("/shortlist/:houseId", async (req: Request, res: Response) => {
  const phone = await requireTenant(req, res);
  if (!phone) return;
  const houseId = String(req.params.houseId ?? "").toUpperCase();
  const count = await removeFromShortlist(phone, houseId);
  res.json({ ok: true, count });
});

appTenantRouter.get("/saved-searches", async (req: Request, res: Response) => {
  const phone = await requireTenant(req, res);
  if (!phone) return;
  const rows = await listSavedSearches(phone);
  res.json({
    searches: rows.map((r) => ({
      id: r.id,
      description: r.raw_description,
      active: r.active,
    })),
  });
});

appTenantRouter.post("/saved-searches", async (req: Request, res: Response) => {
  const phone = await requireTenant(req, res);
  if (!phone) return;
  const body = (req.body ?? {}) as Record<string, unknown>;
  const description = String(body.description ?? "").trim();
  if (description.length < 3) {
    res.status(400).json({ error: "description required" });
    return;
  }
  const filters = (body.filters ?? {}) as Record<string, unknown>;
  const parsed: ParsedSearch = {
    raw_query: description,
    max_rent: filters.maxRent !== undefined ? Number(filters.maxRent) : undefined,
    property_category:
      filters.propertyCategory === "commercial" || filters.propertyCategory === "residential"
        ? filters.propertyCategory
        : undefined,
    region: typeof filters.region === "string" ? filters.region : undefined,
    town: typeof filters.town === "string" ? filters.town : undefined,
    neighbourhood:
      typeof filters.neighbourhood === "string" ? filters.neighbourhood : undefined,
    water: filters.water === true,
    parking: filters.parking === true,
    fenced: filters.fenced === true,
    borehole: filters.borehole === true,
    standby_generator: filters.standbyGenerator === true,
  };
  const id = await createSavedSearch(phone, description, parsed);
  res.json({ ok: true, id });
});

appTenantRouter.delete("/saved-searches/:id", async (req: Request, res: Response) => {
  const phone = await requireTenant(req, res);
  if (!phone) return;
  const id = String(req.params.id ?? "");
  const ok = await deactivateSavedSearch(phone, id);
  if (!ok) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }
  res.json({ ok: true });
});

appTenantRouter.post("/listings/:houseId/flag", async (req: Request, res: Response) => {
  const phone = await requireTenant(req, res);
  if (!phone) return;
  const houseId = String(req.params.houseId ?? "").toUpperCase();
  const reason = String(req.body?.reason ?? "").trim();
  if (reason.length < 3) {
    res.status(400).json({ error: "reason required" });
    return;
  }
  const house = await findHouseById(houseId);
  if (!house) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }
  await flagListing(houseId, phone, reason);
  res.json({ ok: true });
});

appTenantRouter.post("/listings/:houseId/flag-rented", async (req: Request, res: Response) => {
  const phone = await requireTenant(req, res);
  if (!phone) return;
  const houseId = String(req.params.houseId ?? "").toUpperCase();
  const hidden = await reportListingAlreadyRented(houseId, phone);
  if (!hidden) {
    res.status(404).json({ error: "Listing not found or already inactive" });
    return;
  }
  res.json({ ok: true, hidden: true });
});

appTenantRouter.get("/listings/:houseId/concierge", async (req: Request, res: Response) => {
  const phone = await requireTenant(req, res);
  if (!phone) return;
  const houseId = String(req.params.houseId ?? "").toUpperCase();
  const house = await findHouseById(houseId);
  if (!house) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }
  const unlocked = await hasUnlocked(phone, houseId);
  if (!unlocked) {
    res.status(403).json({ error: "Unlock this listing first" });
    return;
  }
  const user = await findUser(phone);
  const lang = (user?.language ?? "en") as Language;
  res.json({ concierge: buildConciergeContent(house, lang) });
});

appTenantRouter.get("/listings/:houseId/lease", async (req: Request, res: Response) => {
  const phone = await requireTenant(req, res);
  if (!phone) return;
  const houseId = String(req.params.houseId ?? "").toUpperCase();
  const house = await findHouseById(houseId);
  if (!house) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }
  const unlocked = await hasUnlocked(phone, houseId);
  if (!unlocked) {
    res.status(403).json({ error: "Unlock this listing first" });
    return;
  }
  const user = await findUser(phone);
  const lang = (user?.language ?? "en") as Language;
  const agreement = await generateRentalAgreement(house, phone, lang);
  res.json({ agreement, format: "text" });
});

appTenantRouter.post("/tenant-verification", async (req: Request, res: Response) => {
  const phone = await requireTenant(req, res);
  if (!phone) return;
  const method = req.body?.method === "bank" ? "bank" : "id";
  await requestVerification(phone, method);
  await setSession(phone, {
    flow: "tenant_extras",
    step: "verify_method",
    language: (await findUser(phone))?.language ?? "en",
    data: { verification_method: method },
  });
  res.json({ ok: true, method, tenantVerified: await isVerified(phone) });
});

appTenantRouter.get("/referral-invite", async (req: Request, res: Response) => {
  const phone = (req as AppRequest).appPhone!;
  const user = await findUser(phone);
  if (!user) {
    res.status(403).json({ error: "Complete signup first" });
    return;
  }
  const lang = (user.language === "fr" ? "fr" : "en") as Language;
  res.json({
    message: buildReferralInviteMessage(lang, phone),
    referralPhone: phone,
  });
});

appTenantRouter.get("/market/heatmap", async (req: Request, res: Response) => {
  const area = typeof req.query.area === "string" ? req.query.area : undefined;
  const data = await getRentHeatMapJson(area);
  res.json({ areas: data });
});

appTenantRouter.get("/market/trends", async (_req: Request, res: Response) => {
  const trends = await getMarketTrendsJson();
  res.json({ trends });
});

appTenantRouter.patch("/diaspora", async (req: Request, res: Response) => {
  const phone = await requireTenant(req, res);
  if (!phone) return;
  const beneficiaryPhone = String(req.body?.beneficiaryPhone ?? "").replace(/\D/g, "");
  if (beneficiaryPhone.length < 8) {
    res.status(400).json({ error: "Valid beneficiary WhatsApp number required" });
    return;
  }
  const session = await getSession(phone);
  const user = await findUser(phone);
  await setSession(phone, {
    flow: session?.flow ?? "main_menu",
    step: session?.step ?? "idle",
    language: user?.language ?? "en",
    data: { ...(session?.data ?? {}), beneficiary_phone: beneficiaryPhone, diaspora: true },
  });
  res.json({ ok: true, beneficiaryPhone });
});

export async function handleAppUnlock(
  phone: string,
  houseId: string,
  body: { confirmPaid?: boolean; beneficiaryPhone?: string }
) {
  const user = await findUser(phone);
  if (!user || user.role !== "tenant") {
    return { status: 403 as const, body: { error: "Only tenants can unlock listing contacts" } };
  }
  const house = await findHouseById(houseId);
  if (!house) {
    return { status: 404 as const, body: { error: "Listing not found" } };
  }
  const lang = (user.language ?? "en") as Language;
  await recordListingView(houseId, phone);

  const session = await getSession(phone);
  const beneficiary =
    body.beneficiaryPhone?.replace(/\D/g, "") ||
    (typeof session?.data?.beneficiary_phone === "string"
      ? session.data.beneficiary_phone
      : undefined);

  const result = await executeAppUnlock(phone, house, lang, {
    confirmPaid: Boolean(body.confirmPaid),
    beneficiaryPhone: beneficiary,
  });

  if (result.ok && result.unlocked) {
    const listing = await resolveListingDetailForViewer(house, phone, user.role, lang);
    const refreshed = await findHouseById(houseId);
    const concierge = refreshed ? buildConciergeContent(refreshed, lang) : undefined;
    return {
      status: 200 as const,
      body: {
        ok: true,
        unlocked: true,
        usedCredit: result.usedCredit,
        amountPaid: result.amountPaid,
        listing,
        concierge,
      },
    };
  }

  if (!result.ok && "quote" in result) {
    return {
      status: 402 as const,
      body: {
        ok: false,
        unlocked: false,
        reason: result.reason,
        quote: result.quote,
        paymentInstructions:
          result.reason === "payment_required"
            ? momoPaymentInstructions(houseId, result.quote.unlockFeeRwf, lang)
            : undefined,
      },
    };
  }

  return { status: 500 as const, body: { error: "Unlock failed" } };
}
