import type { ElectricityMeter, PropertyCategory } from "../constants/property-taxonomy.js";
import { query } from "../db/pool.js";
import type { House } from "./houses.js";

let postgisAvailable: boolean | null = null;

export function resetPostgisCacheForTests(): void {
  postgisAvailable = null;
}

async function hasPostGIS(): Promise<boolean> {
  if (postgisAvailable !== null) return postgisAvailable;
  try {
    const result = await query<{ ok: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'postgis') AS ok`
    );
    postgisAvailable = Boolean(result.rows[0]?.ok);
  } catch {
    postgisAvailable = false;
  }
  return postgisAvailable;
}

export type SearchFilters = {
  minRent?: number;
  maxRent?: number;
  property_category?: PropertyCategory;
  property_subtype?: string;
  region?: string;
  town?: string;
  neighbourhood?: string;
  place?: string;
  water?: boolean;
  parking?: boolean;
  electricity_meter?: ElectricityMeter;
  fenced?: boolean;
  borehole?: boolean;
  standby_generator?: boolean;
  furnished?: boolean;
  security?: boolean;
  minBedrooms?: number;
  minToilets?: number;
};

function buildFilterClauses(
  filters: SearchFilters | undefined,
  startIdx: number
): { conditions: string[]; params: unknown[]; nextIdx: number } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = startIdx;

  if (filters?.minRent) {
    params.push(filters.minRent);
    conditions.push(`rent >= $${paramIdx++}`);
  }
  if (filters?.maxRent) {
    params.push(filters.maxRent);
    conditions.push(`rent <= $${paramIdx++}`);
  }
  if (filters?.property_category) {
    params.push(filters.property_category);
    conditions.push(`property_category = $${paramIdx++}`);
  }
  if (filters?.property_subtype) {
    params.push(filters.property_subtype);
    conditions.push(`property_subtype = $${paramIdx++}`);
  }
  if (filters?.region) {
    params.push(filters.region);
    conditions.push(`region = $${paramIdx++}`);
  }
  if (filters?.town) {
    params.push(`%${filters.town.toLowerCase()}%`);
    conditions.push(`(LOWER(town) LIKE $${paramIdx} OR LOWER(city) LIKE $${paramIdx})`);
    paramIdx++;
  }
  const area = filters?.neighbourhood || filters?.place;
  if (area) {
    params.push(`%${area.toLowerCase()}%`);
    conditions.push(
      `(LOWER(COALESCE(neighbourhood, '')) LIKE $${paramIdx} OR LOWER(COALESCE(city, '')) LIKE $${paramIdx} OR LOWER(COALESCE(town, '')) LIKE $${paramIdx})`
    );
    paramIdx++;
  }
  if (filters?.water) conditions.push(`water = TRUE`);
  if (filters?.parking) conditions.push(`parking = TRUE`);
  if (filters?.furnished) conditions.push(`furnished = TRUE`);
  if (filters?.security) conditions.push(`security = TRUE`);
  if (filters?.fenced) conditions.push(`fenced = TRUE`);
  if (filters?.borehole) conditions.push(`borehole = TRUE`);
  if (filters?.standby_generator) conditions.push(`standby_generator = TRUE`);
  if (filters?.electricity_meter) {
    params.push(filters.electricity_meter);
    conditions.push(
      `(COALESCE(electricity_meter, CASE WHEN electricity THEN 'postpaid' ELSE 'none' END) = $${paramIdx++})`
    );
  }

  return { conditions, params, nextIdx: paramIdx };
}

async function searchWithPostGIS(
  latitude: number,
  longitude: number,
  radiusKm: number,
  filters?: SearchFilters
): Promise<Array<House & { distance_km: number }>> {
  const point = `ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography`;
  const baseParams: unknown[] = [latitude, longitude, radiusKm];
  const { conditions, params: filterParams, nextIdx } = buildFilterClauses(filters, 4);

  const allConditions = [
    `status = 'active'`,
    `location IS NOT NULL`,
    `ST_DWithin(location, ${point}, $3 * 1000)`,
    ...conditions,
  ];

  const params = [...baseParams, ...filterParams, 50];

  const result = await query<House & { distance_km: number }>(
    `SELECT *,
      ST_Distance(location, ${point}) / 1000.0 AS distance_km
     FROM houses
     WHERE ${allConditions.join(" AND ")}
     ORDER BY distance_km ASC
     LIMIT $${nextIdx}`,
    params
  );

  return result.rows.map((row) => ({
    ...row,
    distance_km: Number(row.distance_km),
  }));
}

async function searchWithHaversine(
  latitude: number,
  longitude: number,
  radiusKm: number,
  filters?: SearchFilters
): Promise<Array<House & { distance_km: number }>> {
  const latDelta = radiusKm / 111.0;
  const lonDelta = radiusKm / (111.0 * Math.cos((latitude * Math.PI) / 180));

  const distanceExpr = `(6371 * acos(LEAST(1.0, GREATEST(-1.0,
    cos(radians($1)) * cos(radians(latitude)) * cos(radians(longitude) - radians($2))
    + sin(radians($1)) * sin(radians(latitude))
  ))))`;

  const baseParams: unknown[] = [
    latitude,
    longitude,
    latitude - latDelta,
    latitude + latDelta,
    longitude - lonDelta,
    longitude + lonDelta,
    radiusKm,
  ];

  const { conditions, params: filterParams, nextIdx } = buildFilterClauses(filters, 8);
  const params = [...baseParams, ...filterParams, 50];

  const allConditions = [
    `status = 'active'`,
    `latitude BETWEEN $3 AND $4`,
    `longitude BETWEEN $5 AND $6`,
    `${distanceExpr} <= $7`,
    ...conditions,
  ];

  const result = await query<House & { distance_km: number }>(
    `SELECT *, ${distanceExpr} AS distance_km
     FROM houses
     WHERE ${allConditions.join(" AND ")}
     ORDER BY distance_km ASC
     LIMIT $${nextIdx}`,
    params
  );

  return result.rows.map((row) => ({
    ...row,
    distance_km: Number(row.distance_km),
  }));
}

export async function searchHousesByFilters(
  filters: SearchFilters,
  limit = 50
): Promise<House[]> {
  const { conditions, params, nextIdx } = buildFilterClauses(filters, 1);
  const allConditions = [`status = 'active'`, ...conditions];
  const result = await query<House>(
    `SELECT * FROM houses
     WHERE ${allConditions.join(" AND ")}
     ORDER BY created_at DESC
     LIMIT $${nextIdx}`,
    [...params, limit]
  );
  return result.rows;
}

export async function searchNearbyHousesSpatial(
  latitude: number,
  longitude: number,
  radiusKm: number,
  filters?: SearchFilters
): Promise<Array<House & { distance_km: number }>> {
  if (await hasPostGIS()) {
    try {
      return await searchWithPostGIS(latitude, longitude, radiusKm, filters);
    } catch (err) {
      console.warn("PostGIS search failed, falling back to Haversine:", err);
    }
  }
  return searchWithHaversine(latitude, longitude, radiusKm, filters);
}
