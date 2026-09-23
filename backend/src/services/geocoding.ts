const NOMINATIM_REVERSE = "https://nominatim.openstreetmap.org/reverse";
const NOMINATIM_SEARCH = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "Casa-Rwanda/0.1 (housing-platform)";
const GEO_CACHE_TTL = 60 * 60 * 24 * 7;

export interface GeocodedLocation {
  neighbourhood: string | null;
  city: string | null;
  displayName: string;
}

export interface ForwardGeocodeResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

function geocodeCacheKey(query: string): string {
  return `casa:geo:fwd:${query.toLowerCase().trim().replace(/\s+/g, " ")}`;
}

function reverseGeocodeCacheKey(latitude: number, longitude: number): string {
  return `casa:geo:rev:${latitude.toFixed(4)}:${longitude.toFixed(4)}`;
}

async function getCachedJson<T>(key: string): Promise<T | null> {
  try {
    const { redis } = await import("../redis/client.js");
    if (redis.status !== "ready") return null;
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function setCachedJson(key: string, value: unknown): Promise<void> {
  try {
    const { redis } = await import("../redis/client.js");
    if (redis.status !== "ready") return;
    await redis.set(key, JSON.stringify(value), "EX", GEO_CACHE_TTL);
  } catch {
    /* ignore */
  }
}

export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<GeocodedLocation> {
  const cacheKey = reverseGeocodeCacheKey(latitude, longitude);
  const cached = await getCachedJson<GeocodedLocation>(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: "json",
    addressdetails: "1",
  });

  const response = await fetch(`${NOMINATIM_REVERSE}?${params}`, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    return {
      neighbourhood: null,
      city: null,
      displayName: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
    };
  }

  const data = (await response.json()) as {
    display_name?: string;
    address?: {
      suburb?: string;
      neighbourhood?: string;
      quarter?: string;
      city?: string;
      town?: string;
      village?: string;
    };
  };

  const addr = data.address ?? {};
  const neighbourhood =
    addr.suburb ?? addr.neighbourhood ?? addr.quarter ?? null;
  const city = addr.city ?? addr.town ?? addr.village ?? null;

  const result: GeocodedLocation = {
    neighbourhood,
    city,
    displayName: data.display_name ?? `${latitude}, ${longitude}`,
  };

  await setCachedJson(cacheKey, result);
  return result;
}

/** Resolve a place name in Rwanda to GPS coordinates (cached in Redis). */
export async function forwardGeocode(
  query: string,
  options?: { countryCode?: string }
): Promise<ForwardGeocodeResult | null> {
  const normalized = query.trim();
  if (!normalized) return null;

  const cacheKey = geocodeCacheKey(normalized);
  const cached = await getCachedJson<ForwardGeocodeResult>(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    q: normalized.includes("Rwanda") ? normalized : `${normalized}, Rwanda`,
    format: "json",
    limit: "1",
    countrycodes: options?.countryCode ?? "rw",
  });

  const response = await fetch(`${NOMINATIM_SEARCH}?${params}`, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!response.ok) return null;

  const results = (await response.json()) as Array<{
    lat?: string;
    lon?: string;
    display_name?: string;
  }>;

  const hit = results[0];
  if (!hit?.lat || !hit?.lon) return null;

  const result: ForwardGeocodeResult = {
    latitude: parseFloat(hit.lat),
    longitude: parseFloat(hit.lon),
    displayName: hit.display_name ?? normalized,
  };

  await setCachedJson(cacheKey, result);
  return result;
}

/** Build a search query from parsed tenant text and geocode it. */
export async function resolveSearchCoordinates(parsed: {
  neighbourhood?: string;
  town?: string;
  city?: string;
  region?: string;
  raw_query?: string;
}): Promise<ForwardGeocodeResult | null> {
  const parts = [
    parsed.neighbourhood,
    parsed.town ?? parsed.city,
    parsed.region,
  ].filter(Boolean);

  if (parts.length > 0) {
    const hit = await forwardGeocode(parts.join(", "));
    if (hit) return hit;
  }

  if (parsed.raw_query?.trim()) {
    return forwardGeocode(parsed.raw_query.trim());
  }

  return null;
}
