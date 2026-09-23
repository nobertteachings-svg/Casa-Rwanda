/** Major Rwandan towns used in listing and search shortcuts. */
export const MAJOR_TOWNS = [
  "Kigali",
  "Musanze",
  "Rubavu",
  "Huye",
  "Muhanga",
  "Rwamagana",
  "Nyagatare",
  "Rusizi",
  "Karongi",
  "Nyamata",
  "Kayonza",
  "Gicumbi",
] as const;

export const NEIGHBOURHOODS: Record<string, string[]> = {
  Kigali: [
    "Kimironko",
    "Remera",
    "Kacyiru",
    "Nyarutarama",
    "Gikondo",
    "Kanombe",
    "Nyamirambo",
    "Gisozi",
    "Kibagabaga",
    "Niboye",
    "Muhima",
    "Kinyinya",
    "Gitega",
    "Kabeza",
  ],
  Musanze: ["Muhoza", "Cyuve", "Ruhengeri", "Kinigi"],
  Rubavu: ["Gisenyi", "Gisenyi Town", "Grande Barrière", "Bugeshi"],
  Huye: ["Butare", "Tumba", "Ngoma", "Mukura"],
  Muhanga: ["Gitarama", "Nyamabuye", "Shyogwe"],
  Rwamagana: ["Rwamagana Town", "Kigabiro", "Muyumbu"],
  Nyagatare: ["Nyagatare Town", "Ryabega", "Matimba"],
  Rusizi: ["Cyangugu", "Kamembe", "Gihundwe"],
  Karongi: ["Kibuye", "Bwishyura", "Rubengera"],
  Nyamata: ["Nyamata Town", "Rilima", "Ntarama"],
  Kayonza: ["Kayonza Town", "Mukarange", "Rwinkwavu"],
  Gicumbi: ["Byumba", "Kageyo", "Rukomo"],
};

export function neighbourhoodsForTown(town: string): string[] {
  const key = Object.keys(NEIGHBOURHOODS).find((k) => k.toLowerCase() === town.toLowerCase());
  return key ? NEIGHBOURHOODS[key] : ["Town centre", "Estate", "Along main road"];
}

/** Typical monthly rent bands in RWF. */
export const RENT_PRESETS = [
  30000, 50000, 80000, 100000, 150000, 200000, 300000, 500000, 800000, 1500000,
] as const;

/** Typical asking prices in RWF for houses and land. */
export const SALE_PRICE_PRESETS = [
  10000000, 25000000, 40000000, 60000000, 80000000, 100000000, 150000000, 250000000, 400000000,
] as const;

export const MONTHS_UPFRONT_OPTIONS = [1, 2, 3, 6, 12] as const;
