import Anthropic from "@anthropic-ai/sdk";
import { env, isClaudeConfigured } from "../config/env.js";
import { rwandaDistrictIdsForPrompt } from "../constants/property-taxonomy.js";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return client;
}

export interface ParsedListing {
  property_category: "residential" | "commercial";
  property_subtype: string;
  rent: number;
  months_upfront: number;
  region?: string;
  town?: string;
  neighbourhood?: string;
  city?: string;
  fenced: boolean;
  water: boolean;
  borehole: boolean;
  parking: boolean;
  electricity_meter: "none" | "prepaid" | "postpaid";
  furnished: boolean;
  security: boolean;
  standby_generator: boolean;
  description: string;
}

export interface ParsedSearch {
  property_category?: "residential" | "commercial";
  property_subtype?: string;
  max_rent?: number;
  region?: string;
  town?: string;
  neighbourhood?: string;
  city?: string;
  water?: boolean;
  parking?: boolean;
  electricity_meter?: "none" | "prepaid" | "postpaid";
  furnished?: boolean;
  fenced?: boolean;
  borehole?: boolean;
  standby_generator?: boolean;
  raw_query: string;
}

export async function parseListingFromText(
  text: string,
  language: "en" | "fr"
): Promise<ParsedListing | null> {
  if (!isClaudeConfigured) return null;

  const response = await getClient().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Extract a Rwanda rental listing from this landlord message. Language: ${language}.
Return ONLY valid JSON with keys:
- property_category: "residential" or "commercial"
- property_subtype: one of single_room, double_room, bedsitter, self_contained, studio, one_bedroom, two_bedroom, three_bedroom_plus, maisonette, bungalow, servant_quarter (residential) OR shop, office, warehouse, restaurant, salon, workshop, showroom, commercial_space (commercial)
- rent (number RWF/month), months_upfront (number)
- region (Rwanda district id — one of: ${rwandaDistrictIdsForPrompt()}; e.g. gasabo, kicukiro, musanze)
- town, neighbourhood (quarter)
- fenced (gated), water, borehole (or water tank), parking, electricity_meter (none|prepaid/token|postpaid), furnished, security (askari), standby_generator/backup power (booleans except electricity_meter)
- description (professional paragraph)

Message: "${text}"`,
      },
    ],
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") return null;

  try {
    const json = block.text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(json) as ParsedListing;
  } catch {
    return null;
  }
}

export async function parseSearchFromText(
  text: string,
  language: "en" | "fr"
): Promise<ParsedSearch> {
  if (!isClaudeConfigured) {
    return { raw_query: text };
  }

  const response = await getClient().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Extract rental search filters from this tenant message in Rwanda. Language: ${language}.
Return ONLY valid JSON with optional keys: property_category (residential|commercial), property_subtype, max_rent, region, town, neighbourhood, city, water, parking, electricity_meter (none|prepaid|postpaid), furnished, fenced, borehole, standby_generator, raw_query.

region must be a Rwanda district id when present (one of: ${rwandaDistrictIdsForPrompt()}; e.g. gasabo, kicukiro).
Residential subtypes: single_room, double_room, bedsitter, self_contained, studio, one_bedroom, two_bedroom, three_bedroom_plus, maisonette, bungalow, servant_quarter. Prefer Rwandan terms (bedsitter, self-contained, maisonette).
Commercial subtypes: shop, office, warehouse, restaurant, salon, workshop, showroom, commercial_space.

Message: "${text}"`,
      },
    ],
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") return { raw_query: text };

  try {
    const json = block.text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(json) as ParsedSearch;
  } catch {
    return { raw_query: text };
  }
}

export async function compareHouses(
  houses: Array<{ house_id: string; type: string; rent: number; distance_km?: number; facilities: string }>,
  lang: "en" | "fr"
): Promise<string> {
  if (!isClaudeConfigured) {
    return houses
      .map((h) => `*${h.house_id}*: ${h.rent.toLocaleString()} RWF — ${h.facilities}`)
      .join("\n");
  }

  const response = await getClient().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Compare these Rwanda rental listings for a tenant. Language: ${lang}.
Include price fairness, facilities, and a recommendation. Be concise for WhatsApp.

Listings: ${JSON.stringify(houses)}`,
      },
    ],
  });

  const block = response.content.find((b) => b.type === "text");
  return block?.type === "text" ? block.text : "Comparison unavailable.";
}

export async function suggestPriceAdjustment(
  house: { house_id: string; rent: number; neighbourhood: string | null; type: string },
  areaAvgRent: number,
  lang: "en" | "fr"
): Promise<string> {
  if (!isClaudeConfigured) {
    const diff = house.rent - areaAvgRent;
    if (diff > 0) {
      return lang === "fr"
        ? `Votre loyer est ${diff.toLocaleString()} RWF au-dessus de la moyenne du quartier. Envisagez une baisse.`
        : `Your rent is ${diff.toLocaleString()} RWF above area average. Consider lowering.`;
    }
    return lang === "fr" ? "Votre prix semble compétitif." : "Your price looks competitive.";
  }

  const response = await getClient().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `A landlord's listing ${house.house_id} in ${house.neighbourhood ?? "Rwanda"} has had no unlocks in 2 weeks.
Rent: ${house.rent} RWF. Area average: ${areaAvgRent} RWF. Type: ${house.type}.
Suggest a price adjustment in ${lang}. Be specific with RWF amounts. Keep under 150 words.`,
      },
    ],
  });

  const block = response.content.find((b) => b.type === "text");
  return block?.type === "text" ? block.text : "";
}

export async function generateRentalAgreement(
  house: {
    house_id: string;
    type: string;
    rent: number;
    months_upfront: number;
    neighbourhood: string | null;
    landlord_phone: string;
  },
  tenantPhone: string,
  lang: "en" | "fr"
): Promise<string> {
  if (!isClaudeConfigured) {
    return lang === "fr"
      ? `CONTRAT DE BAIL — ${house.house_id}\nPropriétaire: ${house.landlord_phone}\nLocataire: ${tenantPhone}\nLoyer: ${house.rent} RWF/mois\nCaution: ${house.months_upfront} mois`
      : `RENTAL AGREEMENT — ${house.house_id}\nLandlord: ${house.landlord_phone}\nTenant: ${tenantPhone}\nRent: ${house.rent} RWF/month\nDeposit: ${house.months_upfront} months`;
  }

  const response = await getClient().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Generate a simple rental agreement template for Rwanda.
Language: ${lang}. Property: ${house.type} in ${house.neighbourhood ?? "Rwanda"}.
Rent: ${house.rent} RWF/month. Deposit: ${house.months_upfront} months upfront.
Landlord phone: ${house.landlord_phone}. Tenant phone: ${tenantPhone}.
Include standard Rwanda rental clauses. Format for WhatsApp.`,
      },
    ],
  });

  const block = response.content.find((b) => b.type === "text");
  return block?.type === "text" ? block.text : "Agreement generation failed.";
}

export async function transcribeVoiceNote(
  audioDescription: string,
  lang: "en" | "fr"
): Promise<string | null> {
  if (!isClaudeConfigured) return null;

  const response = await getClient().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `A WhatsApp user sent a voice note about housing in Rwanda (${lang}).
The system could not auto-transcribe audio yet. If this is a placeholder, return null.
Otherwise process this text as if it were transcribed speech about finding or listing a home:
"${audioDescription}"`,
      },
    ],
  });

  const block = response.content.find((b) => b.type === "text");
  return block?.type === "text" ? block.text : null;
}
