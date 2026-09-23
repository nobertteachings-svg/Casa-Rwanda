import type { Language } from "../api/client";

export type PropertyCategory = "residential" | "commercial" | "house_sale" | "land";

/** Rwandan residential types — keep keys aligned with backend property-taxonomy. */
export const RESIDENTIAL_SUBTYPES = [
  { id: "1", key: "single_room", en: "Single room (shared facilities)", fr: "Chambre simple (partagée)" },
  { id: "2", key: "double_room", en: "Double room", fr: "Deux pièces" },
  { id: "3", key: "self_contained", en: "Self-contained", fr: "Self-contained" },
  { id: "4", key: "studio", en: "Studio", fr: "Studio" },
  { id: "5", key: "one_bedroom", en: "1 bedroom", fr: "1 chambre" },
  { id: "6", key: "two_bedroom", en: "2 bedroom", fr: "2 chambres" },
  { id: "7", key: "three_bedroom_plus", en: "3+ bedroom", fr: "3 chambres+" },
  { id: "8", key: "maisonette", en: "Maisonette / duplex", fr: "Maisonette / duplex" },
  { id: "9", key: "bungalow", en: "House / bungalow", fr: "Maison / bungalow" },
  { id: "10", key: "servant_quarter", en: "Annex", fr: "Annexe" },
] as const;

export const COMMERCIAL_SUBTYPES = [
  { id: "1", key: "shop", en: "Shop", fr: "Boutique" },
  { id: "2", key: "office", en: "Office", fr: "Bureau" },
  { id: "3", key: "warehouse", en: "Warehouse / depot", fr: "Entrepôt / dépôt" },
  { id: "4", key: "restaurant", en: "Restaurant / bar", fr: "Restaurant / bar" },
  { id: "5", key: "salon", en: "Salon", fr: "Salon de coiffure" },
  { id: "6", key: "workshop", en: "Workshop", fr: "Atelier" },
  { id: "7", key: "showroom", en: "Showroom", fr: "Showroom" },
  { id: "8", key: "commercial_space", en: "Other commercial", fr: "Autre commercial" },
] as const;

export const HOUSE_SALE_SUBTYPES = [
  { id: "1", key: "house", en: "House", fr: "Maison" },
  { id: "2", key: "villa", en: "Villa", fr: "Villa" },
  { id: "3", key: "bungalow_sale", en: "Bungalow", fr: "Bungalow" },
  { id: "4", key: "maisonette_sale", en: "Maisonette / duplex", fr: "Maisonette / duplex" },
  { id: "5", key: "apartment_sale", en: "Apartment", fr: "Appartement" },
] as const;

export const LAND_SUBTYPES = [
  { id: "1", key: "residential_plot", en: "Plot (residential)", fr: "Parcelle (résidentielle)" },
  { id: "2", key: "commercial_plot", en: "Plot (commercial)", fr: "Parcelle (commerciale)" },
  { id: "3", key: "farmland", en: "Farmland", fr: "Terre agricole" },
  { id: "4", key: "mixed_use_plot", en: "Plot (mixed-use)", fr: "Parcelle (mixte)" },
] as const;

export const ELECTRICITY_OPTIONS = [
  { id: "1", key: "none", en: "No electricity", fr: "Pas d'électricité" },
  { id: "2", key: "prepaid", en: "Token meter (REG)", fr: "Compteur à jetons (REG)" },
  { id: "3", key: "postpaid", en: "Postpaid (REG bill)", fr: "Postpayé (facture REG)" },
] as const;

export function isSaleCategory(category?: string | null): boolean {
  return category === "house_sale" || category === "land";
}

export function subtypesForCategory(category: PropertyCategory) {
  if (category === "commercial") return COMMERCIAL_SUBTYPES;
  if (category === "house_sale") return HOUSE_SALE_SUBTYPES;
  if (category === "land") return LAND_SUBTYPES;
  return RESIDENTIAL_SUBTYPES;
}

export function categoryMenuId(category: PropertyCategory): string {
  if (category === "commercial") return "2";
  if (category === "house_sale") return "3";
  if (category === "land") return "4";
  return "1";
}

export function subtypeLabel(
  id: string,
  lang: Language,
  category: PropertyCategory
): string {
  const list = subtypesForCategory(category);
  const item = list.find((x) => x.id === id || x.key === id);
  if (!item) return id;
  return lang === "fr" ? item.fr : item.en;
}

export function residentialSubtypeNeedsCounts(key: string): boolean {
  return (
    key === "one_bedroom" ||
    key === "two_bedroom" ||
    key === "three_bedroom_plus" ||
    key === "maisonette" ||
    key === "bungalow" ||
    key === "studio" ||
    key === "self_contained" ||
    key === "house" ||
    key === "villa" ||
    key === "bungalow_sale" ||
    key === "maisonette_sale" ||
    key === "apartment_sale"
  );
}
