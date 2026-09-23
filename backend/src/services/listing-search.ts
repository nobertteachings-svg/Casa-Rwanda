import { env } from "../config/env.js";
import type { Language } from "../i18n/messages.js";
import { formatResidentialTypeLabel, type PropertyCategory } from "../constants/property-taxonomy.js";
import type { House } from "./houses.js";
import {
  searchHousesByFilters,
  searchNearbyHousesSpatial,
  type SearchFilters,
} from "./house-search.js";
import { batchLandlordVerified } from "./features/landlord-id-verification.js";
import {
  formatLocation,
  resolvePublicMediaUrl,
  resolvePublicThumbUrl,
  type PublicListing,
  type PublicListingMedia,
} from "./public-listings.js";

export interface SearchListing extends PublicListing {
  latitude: number;
  longitude: number;
  distanceKm?: number;
  landlordVerified: boolean;
  trustTier: string;
  listedAt: string;
  bedroomCount?: number;
  toiletCount?: number;
  monthsUpfront?: number;
}

export interface AppSearchParams {
  mode: "gps" | "manual";
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  maxRent?: number;
  minRent?: number;
  propertyCategory?: PropertyCategory | "either";
  region?: string;
  town?: string;
  neighbourhood?: string;
  place?: string;
  parking?: boolean;
  water?: boolean;
  fenced?: boolean;
  borehole?: boolean;
  standbyGenerator?: boolean;
  sort?: "newest" | "price_asc" | "price_desc" | "distance";
  limit?: number;
  lang?: Language;
  propertySubtype?: string;
  furnished?: boolean;
  security?: boolean;
  electricityMeter?: "none" | "prepaid" | "postpaid";
  minBedrooms?: number;
  minToilets?: number;
}

function toCategoryFilter(
  category?: PropertyCategory | "either"
): PropertyCategory | undefined {
  if (!category || category === "either") return undefined;
  return category;
}

function buildFilters(params: AppSearchParams): SearchFilters {
  return {
    minRent: params.minRent,
    maxRent: params.maxRent,
    property_category: toCategoryFilter(params.propertyCategory),
    property_subtype: params.propertySubtype,
    region: params.region,
    town: params.town,
    neighbourhood: params.neighbourhood,
    place: params.place,
    parking: params.parking,
    water: params.water,
    fenced: params.fenced,
    borehole: params.borehole,
    standby_generator: params.standbyGenerator,
    furnished: params.furnished,
    security: params.security,
    electricity_meter: params.electricityMeter,
    minBedrooms: params.minBedrooms,
    minToilets: params.minToilets,
  };
}

function houseToSearchListing(
  house: House,
  distanceKm?: number,
  lang: Language = "en"
): SearchListing | null {
  const media: PublicListingMedia[] = [];
  for (const ref of house.photos ?? []) {
    if (media.length >= 3) break;
    const url = resolvePublicMediaUrl(ref, "image");
    if (!url) continue;
    media.push({
      type: "image",
      url,
      thumbUrl: resolvePublicThumbUrl(ref, "image") ?? url,
    });
  }
  if (media.length === 0) return null;

  return {
    houseId: house.house_id,
    type: formatResidentialTypeLabel(house, lang),
    propertyCategory: house.property_category ?? "residential",
    rent: house.rent,
    location: formatLocation(house.neighbourhood, house.city ?? null, house.town ?? null),
    media,
    latitude: house.latitude,
    longitude: house.longitude,
    distanceKm,
    landlordVerified: false,
    trustTier: house.trust_tier ?? "standard",
    listedAt: house.created_at.toISOString(),
    monthsUpfront: house.months_upfront,
  };
}

function sortListings(listings: SearchListing[], sort?: AppSearchParams["sort"]): SearchListing[] {
  if (!sort || sort === "newest") {
    return [...listings].sort(
      (a, b) => new Date(b.listedAt).getTime() - new Date(a.listedAt).getTime()
    );
  }
  if (sort === "price_asc") return [...listings].sort((a, b) => a.rent - b.rent);
  if (sort === "price_desc") return [...listings].sort((a, b) => b.rent - a.rent);
  if (sort === "distance") {
    return [...listings].sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  }
  return listings;
}

async function attachLandlordVerified(
  listings: SearchListing[],
  houses: House[]
): Promise<SearchListing[]> {
  if (listings.length === 0) return listings;
  const phoneByHouse = new Map(houses.map((h) => [h.house_id, h.landlord_phone]));
  const verifiedMap = await batchLandlordVerified(houses.map((h) => h.landlord_phone));
  return listings.map((listing) => ({
    ...listing,
    landlordVerified: verifiedMap.get(phoneByHouse.get(listing.houseId) ?? "") ?? false,
  }));
}

export async function searchListingsForApp(
  params: AppSearchParams
): Promise<{ listings: SearchListing[]; total: number }> {
  const limit = Math.min(50, Math.max(1, params.limit ?? 24));
  const filters = buildFilters(params);

  if (params.mode === "gps") {
    if (params.latitude === undefined || params.longitude === undefined) {
      throw new Error("latitude and longitude required for GPS search");
    }
    const radius = params.radiusKm ?? env.DEFAULT_SEARCH_RADIUS_KM;
    const rows = await searchNearbyHousesSpatial(
      params.latitude,
      params.longitude,
      radius,
      filters
    );
    const listings = rows
      .map((h) => houseToSearchListing(h, h.distance_km, params.lang))
      .filter((x): x is SearchListing => x !== null)
      .slice(0, limit);
    return {
      listings: sortListings(
        await attachLandlordVerified(listings, rows.slice(0, limit)),
        params.sort
      ),
      total: rows.length,
    };
  }

  if (!filters.region && !filters.town && !filters.neighbourhood && !filters.place) {
    throw new Error("Provide at least region, town, or neighbourhood for manual search");
  }

  const rows = await searchHousesByFilters(filters, limit);
  const listings = rows
    .map((h) => houseToSearchListing(h, undefined, params.lang))
    .filter((x): x is SearchListing => x !== null);
  return {
    listings: sortListings(await attachLandlordVerified(listings, rows), params.sort),
    total: listings.length,
  };
}

export function parseAppSearchQuery(q: Record<string, unknown>): AppSearchParams {
  const mode = String(q.mode ?? "gps") === "manual" ? "manual" : "gps";
  const lat = q.lat !== undefined ? Number(q.lat) : undefined;
  const lng = q.lng !== undefined ? Number(q.lng) : q.lon !== undefined ? Number(q.lon) : undefined;
  const categoryRaw = String(q.propertyCategory ?? q.category ?? "").trim();
  const propertyCategory =
    categoryRaw === "commercial" || categoryRaw === "residential" || categoryRaw === "either"
      ? categoryRaw
      : undefined;
  const langRaw = String(q.lang ?? "").trim();
  const lang: Language | undefined = langRaw === "fr" || langRaw === "en" ? langRaw : undefined;
  const meterRaw = String(q.electricityMeter ?? q.meter ?? "").trim();
  const electricityMeter =
    meterRaw === "prepaid" || meterRaw === "postpaid" || meterRaw === "none" ? meterRaw : undefined;
  const minBedrooms = q.minBedrooms !== undefined ? Number(q.minBedrooms) : undefined;
  const minToilets = q.minToilets !== undefined ? Number(q.minToilets) : undefined;

  return {
    mode,
    latitude: Number.isFinite(lat) ? lat : undefined,
    longitude: Number.isFinite(lng) ? lng : undefined,
    radiusKm: q.radius !== undefined ? Number(q.radius) : undefined,
    minRent: q.minRent !== undefined ? Number(q.minRent) : undefined,
    maxRent: q.maxRent !== undefined ? Number(q.maxRent) : undefined,
    propertyCategory,
    region: q.region ? String(q.region) : undefined,
    town: q.town ? String(q.town) : undefined,
    neighbourhood: q.neighbourhood ? String(q.neighbourhood) : undefined,
    place: q.place ? String(q.place) : undefined,
    parking: q.parking === "1" || q.parking === "true",
    water: q.water === "1" || q.water === "true",
    fenced: q.fenced === "1" || q.fenced === "true",
    borehole: q.borehole === "1" || q.borehole === "true",
    standbyGenerator: q.standbyGenerator === "1" || q.standbyGenerator === "true",
    furnished: q.furnished === "1" || q.furnished === "true",
    security: q.security === "1" || q.security === "true",
    propertySubtype: q.propertySubtype ? String(q.propertySubtype) : undefined,
    electricityMeter,
    minBedrooms: Number.isFinite(minBedrooms) ? minBedrooms : undefined,
    minToilets: Number.isFinite(minToilets) ? minToilets : undefined,
    sort:
      q.sort === "price_asc" || q.sort === "price_desc" || q.sort === "distance" || q.sort === "newest"
        ? (q.sort as AppSearchParams["sort"])
        : undefined,
    limit: q.limit !== undefined ? Number(q.limit) : undefined,
    lang,
  };
}
