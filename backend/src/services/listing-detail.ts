import type { Language } from "../i18n/messages.js";
import { formatResidentialTypeLabel } from "../constants/property-taxonomy.js";
import type { House } from "./houses.js";
import { isLandlordVerified } from "./features/landlord-id-verification.js";
import {
  formatLocation,
  resolvePublicMediaUrl,
  resolvePublicThumbUrl,
  type PublicListingMedia,
} from "./public-listings.js";

export interface ListingAmenities {
  water: boolean;
  parking: boolean;
  fenced: boolean;
  borehole: boolean;
  furnished: boolean;
  security: boolean;
  standbyGenerator: boolean;
  electricityMeter?: string;
}

export interface ListingDetail {
  houseId: string;
  type: string;
  propertyCategory: string;
  propertySubtype?: string;
  bedroomCount?: number;
  toiletCount?: number;
  rent: number;
  monthsUpfront: number;
  location: string;
  region?: string | null;
  town?: string | null;
  neighbourhood?: string | null;
  latitude: number;
  longitude: number;
  distanceKm?: number;
  status: string;
  media: PublicListingMedia[];
  amenities: ListingAmenities;
  description?: string | null;
  unlocked: boolean;
  landlordPhone?: string;
  landlordVerified: boolean;
  trustTier: string;
  listedAt: string;
  isOwner: boolean;
}

export interface LandlordListingSummary {
  houseId: string;
  type: string;
  rent: number;
  location: string;
  status: string;
  thumbUrl?: string;
}

function buildMedia(house: House): PublicListingMedia[] {
  const media: PublicListingMedia[] = [];
  for (const ref of house.photos ?? []) {
    const url = resolvePublicMediaUrl(ref, "image");
    if (!url) continue;
    media.push({
      type: "image",
      url,
      thumbUrl: resolvePublicThumbUrl(ref, "image") ?? url,
    });
  }
  for (const ref of house.videos ?? []) {
    const url = resolvePublicMediaUrl(ref, "video");
    if (!url) continue;
    media.push({
      type: "video",
      url,
      thumbUrl: resolvePublicThumbUrl(ref, "video") ?? url,
    });
  }
  return media;
}

export function houseToListingDetail(
  house: House,
  opts: {
    unlocked?: boolean;
    landlordPhone?: string;
    landlordVerified?: boolean;
    isOwner?: boolean;
    distanceKm?: number;
    lang?: Language;
  } = {}
): ListingDetail | null {
  const media = buildMedia(house);
  if (media.length === 0 && house.status !== "inactive") return null;

  const meter = house.electricity_meter ?? (house.electricity ? "postpaid" : "none");
  const lang = opts.lang ?? "en";

  return {
    houseId: house.house_id,
    type: formatResidentialTypeLabel(house, lang),
    propertyCategory: house.property_category ?? "residential",
    propertySubtype: house.property_subtype ?? undefined,
    rent: house.rent,
    monthsUpfront: house.months_upfront,
    location: formatLocation(house.neighbourhood, house.city ?? null, house.town ?? null),
    region: house.region,
    town: house.town ?? house.city,
    neighbourhood: house.neighbourhood,
    latitude: house.latitude,
    longitude: house.longitude,
    distanceKm: opts.distanceKm,
    status: house.status,
    media,
    amenities: {
      water: house.water,
      parking: house.parking,
      fenced: house.fenced,
      borehole: house.borehole,
      furnished: house.furnished,
      security: house.security,
      standbyGenerator: Boolean(house.standby_generator),
      electricityMeter: meter,
    },
    description: house.ai_description,
    unlocked: Boolean(opts.unlocked),
    landlordPhone: opts.landlordPhone,
    landlordVerified: Boolean(opts.landlordVerified),
    trustTier: house.trust_tier ?? "standard",
    listedAt: house.created_at.toISOString(),
    isOwner: Boolean(opts.isOwner),
  };
}

export function houseToLandlordSummary(house: House, lang: Language = "en"): LandlordListingSummary {
  const thumb = house.photos?.[0];
  const thumbUrl = thumb ? resolvePublicThumbUrl(thumb, "image") ?? undefined : undefined;
  return {
    houseId: house.house_id,
    type: formatResidentialTypeLabel(house, lang),
    rent: house.rent,
    location: formatLocation(house.neighbourhood, house.city ?? null, house.town ?? null),
    status: house.status,
    thumbUrl,
  };
}

export function mapsDirectionsUrl(
  latitude: number,
  longitude: number,
  platform: "ios" | "android" | "web"
): string {
  const label = encodeURIComponent("Casa listing");
  if (platform === "ios") {
    return `http://maps.apple.com/?daddr=${latitude},${longitude}&q=${label}`;
  }
  if (platform === "android") {
    return `google.navigation:q=${latitude},${longitude}`;
  }
  return `https://maps.google.com/?q=${latitude},${longitude}`;
}

export function whatsAppUrl(phone: string, message?: string): string {
  const digits = phone.replace(/\D/g, "");
  const base = `https://wa.me/${digits}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

export function telUrl(phone: string): string {
  return `tel:+${phone.replace(/\D/g, "")}`;
}

/** Fields landlords may edit from the app */
export interface LandlordListingUpdate {
  rent?: number;
  monthsUpfront?: number;
  neighbourhood?: string;
  town?: string;
  water?: boolean;
  parking?: boolean;
  fenced?: boolean;
  borehole?: boolean;
  furnished?: boolean;
  security?: boolean;
  standbyGenerator?: boolean;
}

export function amenityLabels(lang: Language, amenities: ListingAmenities): string[] {
  const fr = lang === "fr";
  const out: string[] = [];
  if (amenities.water) out.push(fr ? "Eau fiable" : "Water supply");
  if (amenities.parking) out.push("Parking");
  if (amenities.fenced) out.push(fr ? "Clôturé / sécurisé" : "Gated / fenced");
  if (amenities.borehole) out.push(fr ? "Forage / réservoir" : "Borehole / tank");
  if (amenities.furnished) out.push(fr ? "Meublé" : "Furnished");
  if (amenities.security) out.push(fr ? "Sécurité / askari" : "Security / askari");
  if (amenities.standbyGenerator) out.push(fr ? "Alim. de secours" : "Backup power");
  return out;
}

export async function resolveListingDetailForViewer(
  house: House,
  viewerPhone: string,
  viewerRole?: string,
  lang: Language = "en"
): Promise<ListingDetail | null> {
  const { hasUnlocked } = await import("./features/unlocks.js");
  const isOwner = house.landlord_phone === viewerPhone;
  const unlocked =
    isOwner || (viewerRole === "tenant" && (await hasUnlocked(viewerPhone, house.house_id)));
  const landlordVerified = await isLandlordVerified(house.landlord_phone);

  return houseToListingDetail(house, {
    isOwner,
    unlocked,
    landlordPhone: unlocked ? house.landlord_phone : undefined,
    landlordVerified,
    lang,
  });
}
