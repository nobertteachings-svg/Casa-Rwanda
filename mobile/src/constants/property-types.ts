import type { Language } from "../api/client";

/** Rwandan residential types — keep keys aligned with backend property-taxonomy. */
export const RESIDENTIAL_SUBTYPES = [
  { id: "1", key: "single_room", en: "Single room (shared facilities)", fr: "Chambre simple (partagée)" },
  { id: "2", key: "double_room", en: "Double room", fr: "Double room" },
  { id: "3", key: "bedsitter", en: "Bedsitter", fr: "Bedsitter" },
  { id: "4", key: "self_contained", en: "Self-contained", fr: "Self-contained" },
  { id: "5", key: "studio", en: "Studio", fr: "Studio" },
  { id: "6", key: "one_bedroom", en: "1 bedroom", fr: "1 chambre" },
  { id: "7", key: "two_bedroom", en: "2 bedroom", fr: "2 chambres" },
  { id: "8", key: "three_bedroom_plus", en: "3+ bedroom", fr: "3 chambres+" },
  { id: "9", key: "maisonette", en: "Maisonette", fr: "Maisonette" },
  { id: "10", key: "bungalow", en: "Bungalow / house", fr: "Bungalow / maison" },
  { id: "11", key: "servant_quarter", en: "Servant quarter (SQ)", fr: "Servant quarter (SQ)" },
] as const;

export const COMMERCIAL_SUBTYPES = [
  { id: "1", key: "shop", en: "Shop", fr: "Boutique" },
  { id: "2", key: "office", en: "Office", fr: "Bureau" },
  { id: "3", key: "warehouse", en: "Warehouse / go-down", fr: "Entrepôt" },
  { id: "4", key: "restaurant", en: "Restaurant / bar", fr: "Restaurant / bar" },
  { id: "5", key: "salon", en: "Salon", fr: "Salon de coiffure" },
  { id: "6", key: "workshop", en: "Workshop", fr: "Atelier" },
  { id: "7", key: "showroom", en: "Showroom", fr: "Showroom" },
  { id: "8", key: "commercial_space", en: "Other commercial", fr: "Autre commercial" },
] as const;

export const ELECTRICITY_OPTIONS = [
  { id: "1", key: "none", en: "No electricity", fr: "Pas d'électricité" },
  { id: "2", key: "prepaid", en: "Token meter (REG)", fr: "Compteur à jetons (REG)" },
  { id: "3", key: "postpaid", en: "Postpaid (REG bill)", fr: "Postpayé (facture REG)" },
] as const;

export function subtypeLabel(id: string, lang: Language, category: "residential" | "commercial"): string {
  const list = category === "residential" ? RESIDENTIAL_SUBTYPES : COMMERCIAL_SUBTYPES;
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
    key === "self_contained"
  );
}
