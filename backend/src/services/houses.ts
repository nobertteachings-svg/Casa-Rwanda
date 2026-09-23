import { query } from "../db/pool.js";
import type { Language } from "../i18n/messages.js";
import {
  categoryLabel,
  electricityMeterLabel,
  isSaleCategory,
  listingPriceSuffix,
  regionLabel,
  subtypeLabel,
  type ElectricityMeter,
  type PropertyCategory,
} from "../constants/property-taxonomy.js";

export interface House {
  house_id: string;
  landlord_phone: string;
  type: string;
  property_category?: string;
  property_subtype?: string;
  region?: string | null;
  town?: string | null;
  rent: number;
  months_upfront: number;
  latitude: number;
  longitude: number;
  neighbourhood: string | null;
  city: string | null;
  fenced: boolean;
  water: boolean;
  borehole: boolean;
  parking: boolean;
  electricity: boolean;
  electricity_meter?: ElectricityMeter;
  furnished: boolean;
  security: boolean;
  standby_generator?: boolean;
  photos: string[];
  videos?: string[];
  trust_tier?: string;
  ai_description: string | null;
  status: string;
  created_at: Date;
}

export interface CreateHouseInput {
  landlord_phone: string;
  type: string;
  property_category: PropertyCategory;
  property_subtype: string;
  region: string;
  town: string;
  rent: number;
  months_upfront: number;
  latitude: number;
  longitude: number;
  neighbourhood?: string;
  city?: string;
  fenced?: boolean;
  water?: boolean;
  borehole?: boolean;
  parking?: boolean;
  electricity_meter?: ElectricityMeter;
  furnished?: boolean;
  security?: boolean;
  standby_generator?: boolean;
  photos?: string[];
  videos?: string[];
  trust_tier?: string;
  ai_description?: string;
}

export async function createHouse(input: CreateHouseInput): Promise<House> {
  if (!input.videos || input.videos.length === 0) {
    throw new Error("A property walkthrough video is required before publishing.");
  }

  const meter = input.electricity_meter ?? "none";
  const hasElectricity = meter !== "none";

  const result = await query<House>(
    `INSERT INTO houses (
      landlord_phone, type, property_category, property_subtype,
      region, town, rent, months_upfront,
      latitude, longitude, neighbourhood, city,
      fenced, water, borehole, parking, electricity, electricity_meter, furnished, security, standby_generator,
      photos, videos, trust_tier, ai_description
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
    RETURNING *`,
    [
      input.landlord_phone,
      input.type,
      input.property_category,
      input.property_subtype,
      input.region,
      input.town,
      input.rent,
      input.months_upfront,
      input.latitude,
      input.longitude,
      input.neighbourhood ?? null,
      input.city ?? input.town,
      input.fenced ?? false,
      input.water ?? false,
      input.borehole ?? false,
      input.parking ?? false,
      hasElectricity,
      meter,
      input.furnished ?? false,
      input.security ?? false,
      input.standby_generator ?? false,
      input.photos ?? [],
      input.videos ?? [],
      "verified_plus",
      input.ai_description ?? null,
    ]
  );
  const house = result.rows[0];
  const { notifyMatchingSavedSearches } = await import("./features/saved-searches.js");
  await notifyMatchingSavedSearches(house).catch(console.error);
  return house;
}

export async function findHouseById(houseId: string): Promise<House | null> {
  const result = await query<House>(
    "SELECT * FROM houses WHERE house_id = $1",
    [houseId]
  );
  return result.rows[0] ?? null;
}

export async function findHousesByLandlord(phone: string): Promise<House[]> {
  const result = await query<House>(
    "SELECT * FROM houses WHERE landlord_phone = $1 ORDER BY created_at DESC",
    [phone]
  );
  return result.rows;
}

export async function updateHouseStatusByLandlord(
  houseId: string,
  landlordPhone: string,
  status: "active" | "inactive"
): Promise<boolean> {
  const result = await query(
    `UPDATE houses SET status = $3, updated_at = NOW()
     WHERE house_id = $1 AND landlord_phone = $2`,
    [houseId, landlordPhone, status]
  );
  return (result.rowCount ?? 0) > 0;
}

export interface LandlordHouseUpdate {
  rent?: number;
  months_upfront?: number;
  neighbourhood?: string;
  town?: string;
  water?: boolean;
  parking?: boolean;
  fenced?: boolean;
  borehole?: boolean;
  furnished?: boolean;
  security?: boolean;
  standby_generator?: boolean;
  photos_add?: string[];
  videos_add?: string[];
}

export async function updateHouseByLandlord(
  houseId: string,
  landlordPhone: string,
  patch: LandlordHouseUpdate
): Promise<House | null> {
  const fields: string[] = [];
  const values: unknown[] = [houseId, landlordPhone];
  let idx = 3;

  const set = (col: string, val: unknown) => {
    fields.push(`${col} = $${idx++}`);
    values.push(val);
  };

  if (patch.rent !== undefined) set("rent", patch.rent);
  if (patch.months_upfront !== undefined) set("months_upfront", patch.months_upfront);
  if (patch.neighbourhood !== undefined) set("neighbourhood", patch.neighbourhood);
  if (patch.town !== undefined) {
    set("town", patch.town);
    set("city", patch.town);
  }
  if (patch.water !== undefined) set("water", patch.water);
  if (patch.parking !== undefined) set("parking", patch.parking);
  if (patch.fenced !== undefined) set("fenced", patch.fenced);
  if (patch.borehole !== undefined) set("borehole", patch.borehole);
  if (patch.furnished !== undefined) set("furnished", patch.furnished);
  if (patch.security !== undefined) set("security", patch.security);
  if (patch.standby_generator !== undefined) set("standby_generator", patch.standby_generator);
  if (patch.photos_add?.length) {
    fields.push(`photos = COALESCE(photos, '{}') || $${idx++}::text[]`);
    values.push(patch.photos_add);
  }
  if (patch.videos_add?.length) {
    fields.push(`videos = COALESCE(videos, '{}') || $${idx++}::text[]`);
    values.push(patch.videos_add);
  }

  if (fields.length === 0) return findHouseById(houseId);

  fields.push("updated_at = NOW()");
  const result = await query<House>(
    `UPDATE houses SET ${fields.join(", ")}
     WHERE house_id = $1 AND landlord_phone = $2
     RETURNING *`,
    values
  );
  return result.rows[0] ?? null;
}

export function isListingAvailable(house: Pick<House, "status">): boolean {
  return house.status === "active";
}

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function searchNearbyHouses(
  latitude: number,
  longitude: number,
  radiusKm: number,
  filters?: {
    maxRent?: number;
    property_category?: PropertyCategory;
    property_subtype?: string;
    region?: string;
    town?: string;
    water?: boolean;
    parking?: boolean;
    electricity_meter?: ElectricityMeter;
    fenced?: boolean;
    borehole?: boolean;
    standby_generator?: boolean;
  }
): Promise<Array<House & { distance_km: number }>> {
  const { searchNearbyHousesSpatial } = await import("./house-search.js");
  return searchNearbyHousesSpatial(latitude, longitude, radiusKm, filters);
}

export function googleMapsLink(latitude: number, longitude: number): string {
  return `https://maps.google.com/?q=${latitude},${longitude}`;
}

export function formatLocation(house: House, lang: Language): string {
  const parts = [
    house.neighbourhood,
    house.town ?? house.city,
    house.region ? regionLabel(house.region, lang) : null,
  ].filter(Boolean);
  return parts.join(", ") || (lang === "fr" ? "Lieu inconnu" : "Unknown area");
}

export function formatHouseSummary(
  house: House & { distance_km?: number },
  lang: Language
): string {
  const cat = house.property_category as PropertyCategory | undefined;
  const typeLine = house.property_subtype
    ? subtypeLabel(house.property_subtype, lang)
    : house.type;
  const categoryLine = cat ? categoryLabel(cat, lang) : "";

  const meter = house.electricity_meter ?? (house.electricity ? "postpaid" : "none");
  const meterLabel =
    meter !== "none" ? electricityMeterLabel(meter, lang) : null;

  const facilities = [
    house.fenced ? (lang === "fr" ? "Clôturé / sécurisé" : "Gated / fenced") : null,
    house.parking ? "Parking" : null,
    house.standby_generator ? (lang === "fr" ? "Alim. de secours" : "Backup power") : null,
    house.borehole ? (lang === "fr" ? "Citerne / forage" : "Water tank / borehole") : null,
    house.water ? (lang === "fr" ? "Eau courante (WASAC)" : "Running water (WASAC)") : null,
    meterLabel,
  ]
    .filter(Boolean)
    .join(" | ");

  const distance =
    house.distance_km !== undefined
      ? lang === "fr"
        ? `\n📍 ${house.distance_km.toFixed(1)} km`
        : `\n📍 ${house.distance_km.toFixed(1)} km away`
      : "";

  const rentLabel = listingPriceSuffix(house.property_category, lang);
  const priceLine = isSaleCategory(house.property_category)
    ? `${house.rent.toLocaleString()} ${rentLabel}`
    : `${house.rent.toLocaleString()} ${rentLabel} · ${house.months_upfront} ${
        lang === "fr" ? "mois d'avance" : "months upfront"
      }`;

  return (
    `*${house.house_id}*${categoryLine ? ` (${categoryLine})` : ""}\n` +
    `${typeLine}\n` +
    `📍 ${formatLocation(house, lang)}\n` +
    priceLine +
    distance +
    (facilities ? `\n✅ ${facilities}` : "")
  );
}
