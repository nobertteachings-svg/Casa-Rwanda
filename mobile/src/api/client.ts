import { API_URL } from "../config";

export type UserRole = "tenant" | "landlord";
export type Language = "en" | "fr";

export interface CasaUser {
  phone: string;
  role: UserRole;
  language: Language;
  display_name: string | null;
  landlordVerified?: boolean;
  tenantVerified?: boolean;
  paymentsEnabled?: boolean;
  unlockFeeRwf?: number;
  creditsAvailable?: number;
  unlockLimit?: { usedToday: number; limit: number; allowed: boolean };
  beneficiaryPhone?: string | null;
}

export interface MenuOption {
  id: string;
  title: string;
  description?: string;
}

export type UIAction =
  | { kind: "text"; body: string }
  | { kind: "menu"; body: string; options: MenuOption[]; buttonLabel: string }
  | { kind: "image"; ref: string; caption?: string }
  | { kind: "video"; ref: string; caption?: string };

export interface SessionInfo {
  flow: string;
  step: string;
  language?: Language;
  data?: Record<string, unknown>;
}

export interface PublicListingMedia {
  type: "image" | "video";
  url: string;
  thumbUrl: string;
}

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
  propertyCategory?: string;
  rent: number;
  location: string;
  status: string;
  thumbUrl?: string;
}

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
  photosAdd?: string[];
  videosAdd?: string[];
}

export interface ConciergeContent {
  checklist: string;
  negotiation: string;
  documents: string;
}

export interface PublicListing {
  houseId: string;
  type: string;
  propertyCategory: string;
  rent: number;
  location: string;
  media: PublicListingMedia[];
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...init } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof data?.error === "string" ? data.error : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

export function normalizePhone(input: string): string {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("250")) return d;
  if (d.length === 10 && d.startsWith("0")) return `250${d.slice(1)}`;
  if (d.length === 9 && d.startsWith("7")) return `250${d}`;
  return d;
}

export async function requestLoginCode(
  phone: string,
  language?: Language
): Promise<{
  ok: boolean;
  expiresIn: number;
  delivery?: "whatsapp_template" | "whatsapp_click" | "review_bypass" | "existing_user";
  whatsappUrl?: string;
  token?: string;
  phone?: string;
  needsSignup?: boolean;
  user?: CasaUser | null;
}> {
  return request("/api/app/auth/request-code", {
    method: "POST",
    body: JSON.stringify({ phone: normalizePhone(phone), language }),
  });
}

export async function verifyLoginCode(
  phone: string,
  code: string
): Promise<{ token: string; needsSignup: boolean; user: CasaUser | null; phone?: string }> {
  return request("/api/app/auth/verify-code", {
    method: "POST",
    body: JSON.stringify({ phone: normalizePhone(phone), code: code.trim() }),
  });
}

export async function getMe(
  token: string
): Promise<{ user: CasaUser | null; needsSignup: boolean; session: SessionInfo | null }> {
  return request("/api/app/me", { token });
}

export function normalizeUploadBase64(data: string): string {
  const marker = "base64,";
  const i = data.indexOf(marker);
  return i >= 0 ? data.slice(i + marker.length) : data;
}

export async function uploadMedia(
  token: string,
  kind: "image" | "video",
  base64Data: string
): Promise<{ ref: string; kind: string }> {
  return request("/api/app/upload", {
    method: "POST",
    token,
    body: JSON.stringify({ kind, data: normalizeUploadBase64(base64Data) }),
  });
}

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

export interface UnlockQuote {
  houseId: string;
  paymentsEnabled: boolean;
  alreadyUnlocked: boolean;
  unlockFeeRwf: number;
  creditsAvailable: number;
  unlockLimit: { usedToday: number; limit: number; allowed: boolean };
  reference: string;
  canUnlockInstantly: boolean;
  moveInCost: {
    rentMonthly: number;
    upfrontTotal: number;
    unlockFee: number;
    grandTotal: number;
  };
}

export type UnlockResult =
  | {
      ok: true;
      unlocked: true;
      usedCredit?: boolean;
      amountPaid?: number;
      listing?: ListingDetail;
      concierge?: ConciergeContent;
    }
  | {
      ok: false;
      unlocked: false;
      reason: "limit" | "payment_required" | "failed";
      quote?: UnlockQuote;
      paymentInstructions?: string;
    };

export interface GpsSearchParams {
  mode: "gps";
  lat: number;
  lng: number;
  radius?: number;
  maxRent?: number;
  minRent?: number;
  propertyCategory?: "residential" | "commercial" | "house_sale" | "land" | "either";
  propertySubtype?: string;
  minBedrooms?: number;
  minToilets?: number;
  furnished?: boolean;
  security?: boolean;
  electricityMeter?: "none" | "prepaid" | "postpaid";
  parking?: boolean;
  water?: boolean;
  fenced?: boolean;
  borehole?: boolean;
  standbyGenerator?: boolean;
  sort?: "newest" | "price_asc" | "price_desc" | "distance";
}

export interface ManualSearchParams {
  mode: "manual";
  region?: string;
  town?: string;
  neighbourhood?: string;
  place?: string;
  minRent?: number;
  maxRent?: number;
  propertyCategory?: "residential" | "commercial" | "house_sale" | "land" | "either";
  propertySubtype?: string;
  minBedrooms?: number;
  minToilets?: number;
  furnished?: boolean;
  security?: boolean;
  electricityMeter?: "none" | "prepaid" | "postpaid";
  parking?: boolean;
  water?: boolean;
  fenced?: boolean;
  borehole?: boolean;
  standbyGenerator?: boolean;
  sort?: "newest" | "price_asc" | "price_desc" | "distance";
}

export type SearchParams = (GpsSearchParams | ManualSearchParams) & { lang?: Language };

function searchQuery(params: SearchParams): string {
  const q = new URLSearchParams();
  q.set("mode", params.mode);
  if (params.mode === "gps") {
    q.set("lat", String(params.lat));
    q.set("lng", String(params.lng));
    if (params.radius) q.set("radius", String(params.radius));
  } else {
    if (params.region) q.set("region", params.region);
    if (params.town) q.set("town", params.town);
    if (params.neighbourhood) q.set("neighbourhood", params.neighbourhood);
    if (params.place) q.set("place", params.place);
  }
  if (params.maxRent) q.set("maxRent", String(params.maxRent));
  if (params.minRent) q.set("minRent", String(params.minRent));
  if (params.propertyCategory) q.set("propertyCategory", params.propertyCategory);
  if (params.propertySubtype) q.set("propertySubtype", params.propertySubtype);
  if (params.minBedrooms) q.set("minBedrooms", String(params.minBedrooms));
  if (params.minToilets) q.set("minToilets", String(params.minToilets));
  if (params.furnished) q.set("furnished", "1");
  if (params.security) q.set("security", "1");
  if (params.electricityMeter) q.set("electricityMeter", params.electricityMeter);
  if (params.parking) q.set("parking", "1");
  if (params.water) q.set("water", "1");
  if (params.fenced) q.set("fenced", "1");
  if (params.borehole) q.set("borehole", "1");
  if (params.standbyGenerator) q.set("standbyGenerator", "1");
  if (params.sort) q.set("sort", params.sort);
  if (params.lang) q.set("lang", params.lang);
  q.set("limit", "32");
  return q.toString();
}

export async function searchListings(
  params: SearchParams
): Promise<{ listings: SearchListing[]; total: number; updatedAt: string }> {
  return request(`/api/app/search?${searchQuery(params)}`);
}

export async function getListings(limit = 24): Promise<{ listings: PublicListing[]; updatedAt: string }> {
  return request(`/api/app/listings?limit=${limit}`);
}

export async function getUnlockQuote(
  token: string,
  houseId: string
): Promise<{ quote: UnlockQuote; paymentInstructions: string | null }> {
  return request(`/api/app/listings/${encodeURIComponent(houseId)}/unlock-quote`, { token });
}

export async function unlockListing(
  token: string,
  houseId: string,
  opts?: { confirmPaid?: boolean; beneficiaryPhone?: string }
): Promise<UnlockResult> {
  const { token: auth, ...init } = { token } as RequestInit & { token?: string };
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${auth}`,
  };
  const res = await fetch(`${API_URL}/api/app/listings/${encodeURIComponent(houseId)}/unlock`, {
    method: "POST",
    headers,
    body: JSON.stringify(opts ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 402) return data as UnlockResult;
  if (!res.ok) {
    const msg =
      typeof data?.error === "string" ? data.error : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as UnlockResult;
}

export async function getListingDetail(
  token: string | undefined,
  houseId: string
): Promise<{ listing: ListingDetail }> {
  return request(`/api/app/listings/${encodeURIComponent(houseId)}`, token ? { token } : {});
}

export async function getMyListings(
  token: string
): Promise<{ listings: LandlordListingSummary[] }> {
  return request("/api/app/my-listings", { token });
}

export async function updateListing(
  token: string,
  houseId: string,
  patch: LandlordListingUpdate
): Promise<{ ok: boolean; listing: ListingDetail }> {
  return request(`/api/app/listings/${encodeURIComponent(houseId)}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(patch),
  });
}

export async function updateListingStatus(
  token: string,
  houseId: string,
  status: "active" | "inactive"
): Promise<{ ok: boolean; listing: ListingDetail | null }> {
  return request(`/api/app/listings/${encodeURIComponent(houseId)}/status`, {
    method: "POST",
    token,
    body: JSON.stringify({ status }),
  });
}

export async function deleteListing(
  token: string,
  houseId: string
): Promise<{ ok: boolean }> {
  return request(`/api/app/listings/${encodeURIComponent(houseId)}`, {
    method: "DELETE",
    token,
  });
}

export async function bootstrapSession(
  token: string,
  language: Language
): Promise<{ ok: boolean; needsSignup: boolean; language: Language; user: CasaUser | null }> {
  return request("/api/app/session/bootstrap", {
    method: "POST",
    token,
    body: JSON.stringify({ language }),
  });
}

export async function updateAppLanguage(
  token: string,
  language: Language
): Promise<{ ok: boolean; language: Language; needsSignup: boolean; user: CasaUser | null }> {
  return request("/api/app/language", {
    method: "PATCH",
    token,
    body: JSON.stringify({ language }),
  });
}

export async function registerDeviceToken(
  token: string,
  expoPushToken: string,
  platform: string
): Promise<{ ok: boolean }> {
  return request("/api/app/device-token", {
    method: "POST",
    token,
    body: JSON.stringify({ expoPushToken, platform }),
  });
}

export async function unregisterDeviceTokens(token: string): Promise<{ ok: boolean }> {
  return request("/api/app/device-token", { method: "DELETE", token });
}

export async function registerAccount(
  token: string,
  payload: { role: UserRole; language: Language; referrer?: string }
): Promise<{ ok: boolean; user: CasaUser; needsSignup: boolean }> {
  return request("/api/app/register", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export interface UnlockedContact {
  houseId: string;
  landlordPhone: string;
  rent: number;
  neighbourhood: string | null;
  unlockedAt: string;
}

export async function getUnlockedContacts(
  token: string
): Promise<{ contacts: UnlockedContact[] }> {
  return request("/api/app/unlocked", { token });
}

export async function startLandlordVerification(
  token: string
): Promise<{
  ok: boolean;
  actions: UIAction[];
  user: CasaUser | null;
  session: SessionInfo | null;
}> {
  return request("/api/app/verify-id/start", { method: "POST", token, body: "{}" });
}

export async function sendAppMessage(
  token: string,
  payload: {
    text?: string;
    type?: "text" | "location" | "image" | "video";
    latitude?: number;
    longitude?: number;
    mediaRef?: string;
    mediaKind?: "image" | "video";
  }
): Promise<{
  actions: UIAction[];
  session: SessionInfo | null;
  needsSignup: boolean;
  user: CasaUser | null;
}> {
  return request("/api/app/message", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export interface ShortlistItem {
  houseId: string;
  type: string;
  propertyCategory?: string;
  rent: number;
  location: string;
  trustTier: string;
  listedAt: string;
  thumbUrl?: string;
  bedroomCount?: number;
  toiletCount?: number;
  monthsUpfront?: number;
}

export interface CompareListingRow {
  houseId: string;
  type: string;
  propertyCategory?: string;
  rent: number;
  monthsUpfront: number;
  bedroomCount?: number;
  toiletCount?: number;
  location: string;
}

export interface LandlordInterestItem {
  id: string;
  tenantPhone: string;
  houseId: string;
  rent: number;
  location: string;
  unlockedAt: string;
}

export interface SavedSearchRow {
  id: string;
  description: string;
  active: boolean;
}

export interface HeatMapArea {
  neighbourhood: string;
  avgRent: number;
  count: number;
  minRent: number;
  maxRent: number;
}

export async function getShortlist(token: string): Promise<{ items: ShortlistItem[] }> {
  return request("/api/app/shortlist", { token });
}

export async function addToShortlist(token: string, houseId: string): Promise<{ ok: boolean; count: number }> {
  return request(`/api/app/shortlist/${encodeURIComponent(houseId)}`, { method: "POST", token, body: "{}" });
}

export async function removeShortlistItem(token: string, houseId: string): Promise<{ ok: boolean }> {
  return request(`/api/app/shortlist/${encodeURIComponent(houseId)}`, { method: "DELETE", token });
}

export async function compareShortlist(token: string): Promise<{ listings: CompareListingRow[] }> {
  return request("/api/app/shortlist/compare", { method: "POST", token, body: "{}" });
}

export async function getLandlordInterest(
  token: string
): Promise<{ items: LandlordInterestItem[] }> {
  return request("/api/app/landlord/interest", { token });
}

export async function getSavedSearches(token: string): Promise<{ searches: SavedSearchRow[] }> {
  return request("/api/app/saved-searches", { token });
}

export async function createSavedSearchAlert(
  token: string,
  payload: { description: string; filters?: Record<string, unknown> }
): Promise<{ ok: boolean; id: string }> {
  return request("/api/app/saved-searches", { method: "POST", token, body: JSON.stringify(payload) });
}

export async function deleteSavedSearch(token: string, id: string): Promise<{ ok: boolean }> {
  return request(`/api/app/saved-searches/${encodeURIComponent(id)}`, { method: "DELETE", token });
}

export async function flagListingApi(
  token: string,
  houseId: string,
  reason: string
): Promise<{ ok: boolean }> {
  return request(`/api/app/listings/${encodeURIComponent(houseId)}/flag`, {
    method: "POST",
    token,
    body: JSON.stringify({ reason }),
  });
}

export async function requestTenantVerification(
  token: string,
  method: "id" | "momo"
): Promise<{ ok: boolean }> {
  return request("/api/app/tenant-verification", {
    method: "POST",
    token,
    body: JSON.stringify({ method }),
  });
}

export async function getReferralInvite(token: string): Promise<{ message: string; referralPhone: string }> {
  return request("/api/app/referral-invite", { token });
}

export async function getRentHeatMap(token: string, area?: string): Promise<{ areas: HeatMapArea[] }> {
  const q = area ? `?area=${encodeURIComponent(area)}` : "";
  return request(`/api/app/market/heatmap${q}`, { token });
}

export async function getMarketTrends(token: string): Promise<{
  trends: Array<{ neighbourhood: string; currentAvg: number; prevAvg: number; changePct: number }>;
}> {
  return request("/api/app/market/trends", { token });
}

export async function setDiasporaBeneficiary(
  token: string,
  beneficiaryPhone: string
): Promise<{ ok: boolean; beneficiaryPhone: string }> {
  return request("/api/app/diaspora", {
    method: "PATCH",
    token,
    body: JSON.stringify({ beneficiaryPhone }),
  });
}

export async function getLandlordStats(token: string): Promise<{
  listings: Array<{ house_id: string; views: number; unlocks: number }>;
  periodDays: number;
}> {
  return request("/api/app/landlord/stats", { token });
}

export async function compareShortlistAi(
  token: string
): Promise<{ listings: Array<Record<string, unknown>>; comparison: string }> {
  return request("/api/app/shortlist/compare?ai=1", { method: "POST", token, body: "{}" });
}

export async function getListingConcierge(
  token: string,
  houseId: string
): Promise<{ concierge: ConciergeContent }> {
  return request(`/api/app/listings/${encodeURIComponent(houseId)}/concierge`, { token });
}

export async function flagListingRented(token: string, houseId: string): Promise<{ ok: boolean }> {
  return request(`/api/app/listings/${encodeURIComponent(houseId)}/flag-rented`, {
    method: "POST",
    token,
    body: "{}",
  });
}

export async function getListingLease(
  token: string,
  houseId: string,
  asLandlord = false
): Promise<{ agreement: string; format: string }> {
  const path = asLandlord
    ? `/api/app/landlord/listings/${encodeURIComponent(houseId)}/lease`
    : `/api/app/listings/${encodeURIComponent(houseId)}/lease`;
  return request(path, { token });
}

export async function getListingStats(
  token: string,
  houseId: string
): Promise<{ houseId: string; views: number; unlocks: number; periodDays: number }> {
  return request(`/api/app/landlord/listings/${encodeURIComponent(houseId)}/stats`, { token });
}

export async function bulkLandlordStatus(
  token: string,
  status: "active" | "inactive"
): Promise<{ ok: boolean; updated: number }> {
  return request("/api/app/landlord/bulk-status", {
    method: "POST",
    token,
    body: JSON.stringify({ status }),
  });
}
