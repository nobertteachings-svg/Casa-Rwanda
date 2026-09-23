import type { Language } from "../i18n/messages.js";

/** All 30 Rwandan districts (akarere). */
export const RWANDA_DISTRICTS = [
  // City of Kigali
  { id: "gasabo", en: "Gasabo (Kigali)", fr: "Gasabo (Kigali)" },
  { id: "kicukiro", en: "Kicukiro (Kigali)", fr: "Kicukiro (Kigali)" },
  { id: "nyarugenge", en: "Nyarugenge (Kigali)", fr: "Nyarugenge (Kigali)" },
  // Eastern
  { id: "bugesera", en: "Bugesera", fr: "Bugesera" },
  { id: "gatsibo", en: "Gatsibo", fr: "Gatsibo" },
  { id: "kayonza", en: "Kayonza", fr: "Kayonza" },
  { id: "kirehe", en: "Kirehe", fr: "Kirehe" },
  { id: "ngoma", en: "Ngoma", fr: "Ngoma" },
  { id: "nyagatare", en: "Nyagatare", fr: "Nyagatare" },
  { id: "rwamagana", en: "Rwamagana", fr: "Rwamagana" },
  // Northern
  { id: "burera", en: "Burera", fr: "Burera" },
  { id: "gakenke", en: "Gakenke", fr: "Gakenke" },
  { id: "gicumbi", en: "Gicumbi", fr: "Gicumbi" },
  { id: "musanze", en: "Musanze", fr: "Musanze" },
  { id: "rulindo", en: "Rulindo", fr: "Rulindo" },
  // Southern
  { id: "gisagara", en: "Gisagara", fr: "Gisagara" },
  { id: "huye", en: "Huye", fr: "Huye" },
  { id: "kamonyi", en: "Kamonyi", fr: "Kamonyi" },
  { id: "muhanga", en: "Muhanga", fr: "Muhanga" },
  { id: "nyamagabe", en: "Nyamagabe", fr: "Nyamagabe" },
  { id: "nyanza", en: "Nyanza", fr: "Nyanza" },
  { id: "nyaruguru", en: "Nyaruguru", fr: "Nyaruguru" },
  { id: "ruhango", en: "Ruhango", fr: "Ruhango" },
  // Western
  { id: "karongi", en: "Karongi", fr: "Karongi" },
  { id: "ngororero", en: "Ngororero", fr: "Ngororero" },
  { id: "nyabihu", en: "Nyabihu", fr: "Nyabihu" },
  { id: "nyamasheke", en: "Nyamasheke", fr: "Nyamasheke" },
  { id: "rubavu", en: "Rubavu", fr: "Rubavu" },
  { id: "rusizi", en: "Rusizi", fr: "Rusizi" },
  { id: "rutsiro", en: "Rutsiro", fr: "Rutsiro" },
] as const;

/** Common aliases people type instead of the official district id. */
const REGION_ALIASES: Record<string, (typeof RWANDA_DISTRICTS)[number]["id"]> = {
  kigali: "gasabo",
  "kigali city": "gasabo",
  "ville de kigali": "nyarugenge",
  gasabo: "gasabo",
  kicukiro: "kicukiro",
  nyarugenge: "nyarugenge",
  kimironko: "gasabo",
  remora: "gasabo",
  remera: "gasabo",
  kacyiru: "gasabo",
  gisozi: "gasabo",
  kibagabaga: "gasabo",
  nyarutarama: "gasabo",
  kisi: "kicukiro",
  kicukiro: "kicukiro",
  gikondo: "kicukiro",
  kanombe: "kicukiro",
  niboye: "kicukiro",
  nyamirambo: "nyarugenge",
  muhima: "nyarugenge",
  biryogo: "nyarugenge",
  gisenyi: "rubavu",
  rubavu: "rubavu",
  ruhengeri: "musanze",
  musanze: "musanze",
  butare: "huye",
  huye: "huye",
  gitarama: "muhanga",
  muhanga: "muhanga",
  cyangugu: "rusizi",
  rusizi: "rusizi",
  kibuye: "karongi",
  karongi: "karongi",
  byumba: "gicumbi",
  gicumbi: "gicumbi",
  nyagatare: "nyagatare",
  rwamagana: "rwamagana",
  bugesera: "bugesera",
  kamonyi: "kamonyi",
};

/** @deprecated Use RWANDA_DISTRICTS */
export const UGANDA_REGIONS = RWANDA_DISTRICTS;

export type PropertyCategory = "residential" | "commercial";

/**
 * Rwandan residential typology (how landlords and agents advertise).
 * Includes self-contained — very common in Rwanda listings.
 */
export const RESIDENTIAL_SUBTYPES = [
  {
    id: "single_room",
    en: "Single room (shared bathroom / kitchen)",
    fr: "Chambre simple (sanitaires / cuisine partagés)",
  },
  {
    id: "double_room",
    en: "Double room (two rooms, shared facilities)",
    fr: "Double room (deux pièces, sanitaires partagés)",
  },
  {
    id: "bedsitter",
    en: "Bedsitter (room + bathroom + kitchenette)",
    fr: "Bedsitter (chambre + salle de bain + kitchenette)",
  },
  {
    id: "self_contained",
    en: "Self-contained (private bathroom & kitchen)",
    fr: "Self-contained (salle de bain et cuisine privées)",
  },
  {
    id: "studio",
    en: "Studio (open-plan living + sleeping)",
    fr: "Studio (pièce ouverte salon / chambre)",
  },
  {
    id: "one_bedroom",
    en: "1 bedroom (sitting room + bedroom)",
    fr: "1 chambre (salon + chambre)",
  },
  {
    id: "two_bedroom",
    en: "2 bedroom",
    fr: "2 chambres",
  },
  {
    id: "three_bedroom_plus",
    en: "3+ bedroom",
    fr: "3 chambres ou plus",
  },
  {
    id: "maisonette",
    en: "Maisonette (multi-level)",
    fr: "Maisonette (plusieurs niveaux)",
  },
  {
    id: "bungalow",
    en: "Bungalow / standalone house",
    fr: "Bungalow / maison individuelle",
  },
  {
    id: "servant_quarter",
    en: "Servant quarter (SQ / boys quarter)",
    fr: "Servant quarter (SQ)",
  },
] as const;

/** Map legacy fork subtype ids → Rwanda ids (read-path safety). */
const LEGACY_SUBTYPE_ALIASES: Record<string, string> = {
  single_room_basic: "single_room",
  single_room_toilet: "bedsitter",
  single_room_toilet_kitchen: "self_contained",
  apartment_2room_1toilet: "two_bedroom",
  apartment_2room_2toilet: "two_bedroom",
  apartment_3room_plus: "three_bedroom_plus",
  apartment: "two_bedroom",
  standalone_house: "bungalow",
  sq: "servant_quarter",
  "servant quarters": "servant_quarter",
  "boys quarter": "servant_quarter",
  "boys quarters": "servant_quarter",
  "self contained": "self_contained",
  selfcontained: "self_contained",
  "double rooms": "double_room",
};

export const COMMERCIAL_SUBTYPES = [
  { id: "shop", en: "Shop / retail space", fr: "Boutique / espace commercial" },
  { id: "office", en: "Office space", fr: "Espace bureau" },
  { id: "warehouse", en: "Warehouse / go-down", fr: "Entrepôt / go-down" },
  { id: "restaurant", en: "Restaurant / bar / café", fr: "Restaurant / bar / café" },
  { id: "salon", en: "Salon / barbershop", fr: "Salon de coiffure / barbier" },
  { id: "workshop", en: "Workshop / garage", fr: "Atelier / garage" },
  { id: "showroom", en: "Showroom / display space", fr: "Showroom / espace d'exposition" },
  { id: "commercial_space", en: "Other commercial space", fr: "Autre espace commercial" },
] as const;

export type PropertySubtype =
  | (typeof RESIDENTIAL_SUBTYPES)[number]["id"]
  | (typeof COMMERCIAL_SUBTYPES)[number]["id"];

function normalizeSubtypeId(subtypeId: string): string {
  return LEGACY_SUBTYPE_ALIASES[subtypeId] ?? subtypeId;
}

export function regionLabel(regionId: string, lang: Language): string {
  const r = RWANDA_DISTRICTS.find((x) => x.id === regionId);
  if (!r) return regionId;
  return lang === "fr" ? r.fr : r.en;
}

export function subtypeLabel(subtypeId: string, lang: Language): string {
  const id = normalizeSubtypeId(subtypeId);
  const all = [...RESIDENTIAL_SUBTYPES, ...COMMERCIAL_SUBTYPES];
  const s = all.find((x) => x.id === id);
  if (!s) return subtypeId;
  return lang === "fr" ? s.fr : s.en;
}

export function categoryLabel(category: PropertyCategory, lang: Language): string {
  if (category === "commercial") return lang === "fr" ? "Commercial" : "Commercial";
  return lang === "fr" ? "Résidentiel" : "Residential";
}

/** Display label for a listing type in the mobile API. */
export function formatResidentialTypeLabel(
  house: { type?: string; property_subtype?: string; property_category?: string },
  lang: Language
): string {
  if (house.property_subtype) return subtypeLabel(house.property_subtype, lang);
  if (house.property_category === "commercial" || house.property_category === "residential") {
    return categoryLabel(house.property_category, lang);
  }
  return house.type?.trim() || "Home";
}

export function formatRegionMenu(lang: Language): string {
  const lines = RWANDA_DISTRICTS.map(
    (r, i) => `*${i + 1}.* ${lang === "fr" ? r.fr : r.en}`
  );
  const header =
    lang === "fr" ? "Sélectionnez votre district :" : "Select your district:";
  return `${header}\n\n${lines.join("\n")}`;
}

export function formatSubtypeMenu(category: PropertyCategory, lang: Language): string {
  const list = category === "residential" ? RESIDENTIAL_SUBTYPES : COMMERCIAL_SUBTYPES;
  const lines = list.map((s, i) => `*${i + 1}.* ${lang === "fr" ? s.fr : s.en}`);
  const header =
    lang === "fr"
      ? category === "residential"
        ? "Type de logement résidentiel :"
        : "Type d'espace commercial :"
      : category === "residential"
        ? "Residential property type:"
        : "Commercial property type:";
  return `${header}\n\n${lines.join("\n")}`;
}

export function parseRegionChoice(choice: string): string | null {
  const trimmed = choice.trim();
  const idx = parseInt(trimmed, 10);
  if (
    Number.isInteger(idx) &&
    String(idx) === trimmed &&
    idx >= 1 &&
    idx <= RWANDA_DISTRICTS.length
  ) {
    return RWANDA_DISTRICTS[idx - 1].id;
  }

  const lower = trimmed.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  const compact = lower.replace(/\s+/g, "");
  const underscored = lower.replace(/\s+/g, "_");

  const alias = REGION_ALIASES[lower] ?? REGION_ALIASES[compact];
  if (alias) return alias;

  const match = RWANDA_DISTRICTS.find(
    (r) =>
      r.id === underscored ||
      r.id === compact ||
      r.en.toLowerCase() === lower ||
      r.fr.toLowerCase() === lower ||
      r.en.toLowerCase().replace(/[()']/g, "").trim() === lower
  );
  return match?.id ?? null;
}

/** Comma-separated district ids for AI prompts (kept in sync with RWANDA_DISTRICTS). */
export function rwandaDistrictIdsForPrompt(): string {
  return RWANDA_DISTRICTS.map((s) => s.id).join(", ");
}

export function parseSubtypeChoice(
  choice: string,
  category: PropertyCategory
): string | null {
  const list = category === "residential" ? RESIDENTIAL_SUBTYPES : COMMERCIAL_SUBTYPES;
  const idx = parseInt(choice.trim(), 10);
  if (idx >= 1 && idx <= list.length) return list[idx - 1].id;

  const lower = choice.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  const byAlias = LEGACY_SUBTYPE_ALIASES[choice.trim()] ?? LEGACY_SUBTYPE_ALIASES[lower.replace(/\s+/g, "_")];
  if (byAlias && category === "residential") return byAlias;

  const match = list.find(
    (s) =>
      s.id === lower.replace(/\s+/g, "_") ||
      s.en.toLowerCase().startsWith(lower) ||
      s.id.replace(/_/g, " ") === lower
  );
  return match?.id ?? null;
}

export function parseCategoryChoice(choice: string): PropertyCategory | null {
  const c = choice.trim().toLowerCase();
  if (c === "1" || c.includes("resident")) return "residential";
  if (c === "2" || c.includes("commercial") || c.includes("business")) return "commercial";
  return null;
}

/** Map subtype to legacy `type` column for DB compatibility */
export function legacyTypeFromSubtype(subtype: string): string {
  const id = normalizeSubtypeId(subtype);
  if (id === "single_room" || id === "double_room" || id === "bedsitter" || id === "servant_quarter") {
    return "room";
  }
  if (id === "self_contained") return "apartment";
  if (
    id === "studio" ||
    id === "one_bedroom" ||
    id === "two_bedroom" ||
    id === "three_bedroom_plus" ||
    id === "maisonette" ||
    id === "bungalow"
  ) {
    return "apartment";
  }
  if (
    ["shop", "office", "warehouse", "restaurant", "salon", "workshop", "showroom", "commercial_space"].includes(
      id
    )
  ) {
    return "apartment";
  }
  return "room";
}

export const ELECTRICITY_METER_TYPES = [
  { id: "none", en: "No electricity", fr: "Pas d'électricité" },
  { id: "prepaid", en: "Token meter (REG prepaid)", fr: "Compteur à jetons (REG)" },
  { id: "postpaid", en: "Postpaid meter (REG bill)", fr: "Compteur postpayé (facture REG)" },
] as const;

export type ElectricityMeter = (typeof ELECTRICITY_METER_TYPES)[number]["id"];

export function electricityMeterLabel(meter: string, lang: Language): string {
  const m = ELECTRICITY_METER_TYPES.find((x) => x.id === meter);
  if (!m) return meter;
  return lang === "fr" ? m.fr : m.en;
}

export function formatElectricityMeterMenu(lang: Language): string {
  const lines = ELECTRICITY_METER_TYPES.map(
    (m, i) => `*${i + 1}.* ${lang === "fr" ? m.fr : m.en}`
  );
  const header =
    lang === "fr"
      ? "Type de compteur électrique :"
      : "Electricity meter type:";
  return `${header}\n\n${lines.join("\n")}`;
}

export function parseElectricityMeterChoice(choice: string): ElectricityMeter | null {
  const idx = parseInt(choice.trim(), 10);
  if (idx >= 1 && idx <= ELECTRICITY_METER_TYPES.length) {
    return ELECTRICITY_METER_TYPES[idx - 1].id;
  }
  const lower = choice.trim().toLowerCase();
  if (["none", "no", "non", "pas"].some((w) => lower.includes(w))) return "none";
  if (
    lower.includes("prepaid") ||
    lower.includes("token") ||
    lower.includes("prépayé") ||
    lower.includes("prepaye") ||
    lower.includes("reg")
  ) {
    return "prepaid";
  }
  if (lower.includes("postpaid") || lower.includes("postpayé") || lower.includes("postpaye") || lower.includes("bill")) {
    return "postpaid";
  }
  return null;
}

export function formatFacilitiesSummary(
  draft: {
    fenced?: boolean;
    parking?: boolean;
    standby_generator?: boolean;
    borehole?: boolean;
    water?: boolean;
    electricity_meter?: ElectricityMeter;
    furnished?: boolean;
    security?: boolean;
  },
  lang: Language
): string {
  const boolItems = [
    { key: "fenced", en: "Gated / fenced", fr: "Clôturé / sécurisé" },
    { key: "parking", en: "Parking", fr: "Parking" },
    { key: "standby_generator", en: "Backup power / generator", fr: "Alimentation de secours / générateur" },
    { key: "borehole", en: "Borehole / water tank", fr: "Forage / réservoir d'eau" },
    { key: "water", en: "Reliable water supply", fr: "Eau fiable" },
    { key: "furnished", en: "Furnished", fr: "Meublé" },
    { key: "security", en: "Security / askari", fr: "Sécurité / askari" },
  ] as const;

  const lines = boolItems.map(({ key, en, fr }) => {
    const val = draft[key as keyof typeof draft];
    const yes = lang === "fr" ? "Oui" : "Yes";
    const no = lang === "fr" ? "Non" : "No";
    const label = lang === "fr" ? fr : en;
    return `${label}: ${val ? yes : no}`;
  });

  if (draft.electricity_meter) {
    lines.push(
      `${lang === "fr" ? "Électricité" : "Electricity"}: ${electricityMeterLabel(draft.electricity_meter, lang)}`
    );
  }

  return lines.join("\n");
}
