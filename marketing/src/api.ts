export interface PublicStats {
  listings: {
    available: number;
    residential: number;
    commercial: number;
    forSale: number;
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
  propertySubtype?: string;
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
  return n.toLocaleString("en-RW");
}

export function isSaleListing(category?: string | null): boolean {
  return category === "house_sale" || category === "land";
}

export function formatRent(amount: number, _lang?: "en" | "fr"): string {
  return `${amount.toLocaleString("en-RW")} RWF`;
}

export function formatListingPrice(amount: number, _category?: string | null): string {
  return formatRent(amount);
}

export function categoryLabel(category?: string | null): string {
  if (category === "commercial") return "Commercial";
  if (category === "house_sale") return "House for sale";
  if (category === "land") return "Land for sale";
  return "To rent";
}

const PROPERTY_LABELS: Record<string, string> = {
  single_room: "Single room",
  double_room: "Double room",
  self_contained: "Self-contained",
  studio: "Studio",
  one_bedroom: "1 bedroom",
  two_bedroom: "2 bedroom",
  three_bedroom_plus: "3+ bedroom",
  maisonette: "Maisonette / duplex",
  bungalow: "House / bungalow",
  servant_quarter: "Annex",
  shop: "Shop",
  office: "Office",
  warehouse: "Warehouse / depot",
  restaurant: "Restaurant / bar",
  salon: "Salon",
  workshop: "Workshop",
  showroom: "Showroom",
  commercial_space: "Commercial space",
  house: "House",
  villa: "Villa",
  bungalow_sale: "Bungalow",
  maisonette_sale: "Maisonette / duplex",
  apartment_sale: "Apartment",
  residential_plot: "Plot (residential)",
  commercial_plot: "Plot (commercial)",
  farmland: "Farmland",
  mixed_use_plot: "Plot (mixed-use)",
  room: "Single room",
  apartment: "Self-contained",
};

export function propertyLabel(type: string, _lang?: "en" | "fr", subtype?: string): string {
  const key = (subtype || type || "").trim();
  return PROPERTY_LABELS[key] ?? key.replace(/_/g, " ");
}
