/** All 30 Rwandan districts — keep in sync with backend RWANDA_DISTRICTS. */
export const RWANDA_DISTRICTS = [
  { id: "gasabo", en: "Gasabo (Kigali)", fr: "Gasabo (Kigali)" },
  { id: "kicukiro", en: "Kicukiro (Kigali)", fr: "Kicukiro (Kigali)" },
  { id: "nyarugenge", en: "Nyarugenge (Kigali)", fr: "Nyarugenge (Kigali)" },
  { id: "bugesera", en: "Bugesera", fr: "Bugesera" },
  { id: "gatsibo", en: "Gatsibo", fr: "Gatsibo" },
  { id: "kayonza", en: "Kayonza", fr: "Kayonza" },
  { id: "kirehe", en: "Kirehe", fr: "Kirehe" },
  { id: "ngoma", en: "Ngoma", fr: "Ngoma" },
  { id: "nyagatare", en: "Nyagatare", fr: "Nyagatare" },
  { id: "rwamagana", en: "Rwamagana", fr: "Rwamagana" },
  { id: "burera", en: "Burera", fr: "Burera" },
  { id: "gakenke", en: "Gakenke", fr: "Gakenke" },
  { id: "gicumbi", en: "Gicumbi", fr: "Gicumbi" },
  { id: "musanze", en: "Musanze", fr: "Musanze" },
  { id: "rulindo", en: "Rulindo", fr: "Rulindo" },
  { id: "gisagara", en: "Gisagara", fr: "Gisagara" },
  { id: "huye", en: "Huye", fr: "Huye" },
  { id: "kamonyi", en: "Kamonyi", fr: "Kamonyi" },
  { id: "muhanga", en: "Muhanga", fr: "Muhanga" },
  { id: "nyamagabe", en: "Nyamagabe", fr: "Nyamagabe" },
  { id: "nyanza", en: "Nyanza", fr: "Nyanza" },
  { id: "nyaruguru", en: "Nyaruguru", fr: "Nyaruguru" },
  { id: "ruhango", en: "Ruhango", fr: "Ruhango" },
  { id: "karongi", en: "Karongi", fr: "Karongi" },
  { id: "ngororero", en: "Ngororero", fr: "Ngororero" },
  { id: "nyabihu", en: "Nyabihu", fr: "Nyabihu" },
  { id: "nyamasheke", en: "Nyamasheke", fr: "Nyamasheke" },
  { id: "rubavu", en: "Rubavu", fr: "Rubavu" },
  { id: "rusizi", en: "Rusizi", fr: "Rusizi" },
  { id: "rutsiro", en: "Rutsiro", fr: "Rutsiro" },
] as const;

/** @deprecated Use RWANDA_DISTRICTS */
export const UGANDA_REGIONS = RWANDA_DISTRICTS;

export type RegionId = (typeof RWANDA_DISTRICTS)[number]["id"];

export function regionLabel(id: string, lang: "en" | "fr" = "en"): string {
  const r = RWANDA_DISTRICTS.find((x) => x.id === id);
  if (!r) return id;
  return lang === "fr" ? r.fr : r.en;
}
