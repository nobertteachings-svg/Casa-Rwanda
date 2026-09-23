import { query } from "../../db/pool.js";
import type { House } from "../houses.js";
import { formatHouseSummary } from "../houses.js";
import { sendHouseListingMedia } from "./listing-media.js";
import type { ParsedSearch } from "../claude.js";

export async function createSavedSearch(
  tenantPhone: string,
  rawDescription: string,
  queryJson: ParsedSearch
): Promise<string> {
  const result = await query<{ id: string }>(
    `INSERT INTO saved_searches (tenant_phone, query_json, raw_description)
     VALUES ($1, $2, $3) RETURNING id`,
    [tenantPhone, JSON.stringify(queryJson), rawDescription]
  );
  return result.rows[0].id;
}

export async function listSavedSearches(tenantPhone: string): Promise<
  Array<{ id: string; raw_description: string; active: boolean }>
> {
  const result = await query<{ id: string; raw_description: string; active: boolean }>(
    `SELECT id, raw_description, active FROM saved_searches
     WHERE tenant_phone = $1 ORDER BY created_at DESC`,
    [tenantPhone]
  );
  return result.rows;
}

export function houseMatchesSearch(house: House, filters: ParsedSearch): boolean {
  if (filters.max_rent && house.rent > filters.max_rent) return false;
  if (filters.property_category && house.property_category !== filters.property_category) return false;
  if (filters.property_subtype && house.property_subtype !== filters.property_subtype) return false;
  if (filters.region && house.region !== filters.region) return false;
  if (filters.town) {
    const t = filters.town.toLowerCase();
    const match =
      house.town?.toLowerCase().includes(t) || house.city?.toLowerCase().includes(t);
    if (!match) return false;
  }
  if (filters.water && !house.water) return false;
  if (filters.parking && !house.parking) return false;
  if (filters.electricity_meter) {
    const meter = house.electricity_meter ?? (house.electricity ? "postpaid" : "none");
    if (meter !== filters.electricity_meter) return false;
  }
  if (filters.fenced && !house.fenced) return false;
  if (filters.borehole && !house.borehole) return false;
  if (filters.standby_generator && !house.standby_generator) return false;
  if (filters.neighbourhood) {
    const n = filters.neighbourhood.toLowerCase();
    const match =
      house.neighbourhood?.toLowerCase().includes(n) ||
      house.city?.toLowerCase().includes(n);
    if (!match) return false;
  }
  return true;
}

export async function notifyMatchingSavedSearches(house: House): Promise<void> {
  const searches = await query<{
    id: string;
    tenant_phone: string;
    query_json: ParsedSearch;
  }>(
    `SELECT id, tenant_phone, query_json FROM saved_searches WHERE active = TRUE`
  );

  for (const search of searches.rows) {
    if (!houseMatchesSearch(house, search.query_json)) continue;

    const msg =
      `🔔 *New listing matches your saved search!*\n\n` +
      formatHouseSummary(house, "en") +
      `\n\nReply MENU → Search to view details.`;

    await sendHouseListingMedia(search.tenant_phone, house, "en", { caption: msg });
  }
}
