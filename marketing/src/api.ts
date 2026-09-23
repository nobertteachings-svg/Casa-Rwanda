export interface PublicStats {
  listings: {
    available: number;
    residential: number;
    commercial: number;
    total: number;
  };
  users: {
    tenants: number;
    landlords: number;
    total: number;
    newThisWeek: number;
  };
  updatedAt: string;
}

export interface PublicListingMedia {
  type: "image" | "video";
  url: string;
  thumbUrl?: string;
}

export interface PublicListing {
  houseId: string;
  type: string;
  propertyCategory: string;
  rent: number;
  location: string;
  media: PublicListingMedia[];
}

export interface PublicListingsResponse {
  listings: PublicListing[];
  updatedAt: string;
}

function apiBase(): string {
  const built = import.meta.env.VITE_API_URL as string | undefined;
  return (built ?? "").replace(/\/$/, "");
}

function publicUrl(path: string): string {
  const base = apiBase();
  return base ? `${base}${path}` : path;
}

export async function fetchPublicStats(): Promise<PublicStats> {
  const res = await fetch(publicUrl("/api/public/stats"));
  if (!res.ok) throw new Error("Failed to load stats");
  return res.json() as Promise<PublicStats>;
}

export async function fetchPublicListings(): Promise<PublicListingsResponse> {
  const res = await fetch(publicUrl("/api/public/listings"));
  if (!res.ok) throw new Error("Failed to load listings");
  return res.json() as Promise<PublicListingsResponse>;
}

/** Resolve API-relative media paths when VITE_API_URL is set in production. */
export function mediaSrc(url: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return publicUrl(url);
}

export function mediaThumb(item: PublicListingMedia): string {
  return mediaSrc(item.thumbUrl || item.url);
}

export function formatCount(n: number): string {
  return n.toLocaleString();
}

export function formatRent(amount: number, lang: "en" | "fr"): string {
  const locale = lang === "fr" ? "fr-FR" : "en-GB";
  return `${amount.toLocaleString(locale)} RWF`;
}

export function propertyLabel(type: string, lang: "en" | "fr"): string {
  const labels: Record<string, { en: string; fr: string }> = {
    room: { en: "Room", fr: "Chambre" },
    apartment: { en: "Apartment", fr: "Appartement" },
    villa: { en: "Villa", fr: "Villa" },
    studio: { en: "Studio", fr: "Studio" },
  };
  return labels[type]?.[lang] ?? type;
}
