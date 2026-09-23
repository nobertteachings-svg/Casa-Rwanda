import type { Language } from "../../i18n/messages.js";
import type { House } from "../houses.js";
import { sendTextMessage } from "../transport.js";

export interface ConciergeContent {
  checklist: string;
  negotiation: string;
  documents: string;
}

export function buildConciergeContent(house: House, _lang: Language): ConciergeContent {
  const checklist = buildEnglishChecklist(house);
  const negotiation =
    `Negotiation tips:\n` +
    `• Ask if rent includes water and electricity\n` +
    `• Offer a longer lease for a better rate\n` +
    `• Check if the landlord accepts monthly payments\n` +
    `• In Rwanda, agree agency and legal fees in writing before you pay`;
  const documents =
    `Documents commonly asked for in Rwanda:\n` +
    `• National ID, international passport, or driver's licence\n` +
    `• Signed tenancy agreement\n` +
    `• Receipt for rent paid in advance\n` +
    `• Latest REG bill or token meter statement for the property\n` +
    `• Condition report (recommended)`;
  return { checklist, negotiation, documents };
}

export async function sendPostUnlockConcierge(
  phone: string,
  house: House,
  lang: Language
): Promise<void> {
  const content = buildConciergeContent(house, lang);
  await sendTextMessage(phone, content.checklist);
  await sendTextMessage(phone, `🤝 *Negotiation tips:*\n${content.negotiation}`);
  await sendTextMessage(
    phone,
    `📄 *Documents to take along:*\n${content.documents}\n\nReply *LEASE* to generate an agreement template.`
  );
}

function meterChecklistItem(house: House, lang: "en" | "fr"): string {
  const meter = house.electricity_meter ?? (house.electricity ? "postpaid" : "none");
  if (meter === "prepaid") {
    return lang === "fr"
      ? "✅ Vérifier le compteur à jetons (REG) et le solde"
      : "✅ Check token meter (REG) and current credit";
  }
  if (meter === "postpaid") {
    return lang === "fr"
      ? "✅ Vérifier le compteur postpayé et les factures REG récentes"
      : "✅ Check postpaid meter and recent REG bills";
  }
  return lang === "fr"
    ? "⚠️ Pas d'électricité — confirmer avec le propriétaire"
    : "⚠️ No electricity — confirm with landlord";
}

function buildEnglishChecklist(house: House): string {
  const items = [
    "✅ Check water pressure in all taps",
    meterChecklistItem(house, "en"),
    house.fenced ? "✅ Inspect gate / compound security" : "⚠️ Not gated — check neighbourhood safety",
    house.parking ? "✅ Confirm parking space size" : null,
    "✅ Check for mould, leaks, and pests",
    "✅ Visit at different times of day (noise)",
    "✅ Ask neighbours about the area",
  ].filter(Boolean);
  return `📋 *Visit checklist for ${house.house_id}:*\n${items.join("\n")}`;
}

function buildFrenchChecklist(house: House): string {
  const items = [
    "✅ Vérifier la pression d'eau",
    meterChecklistItem(house, "fr"),
    house.fenced ? "✅ Inspecter portail / compound" : "⚠️ Non clôturé — vérifier la sécurité",
    house.parking ? "✅ Confirmer la place de parking" : null,
    "✅ Chercher moisissure, fuites et nuisibles",
    "✅ Visiter à différents moments (bruit)",
    "✅ Demander aux voisins",
  ].filter(Boolean);
  return `📋 *Liste de visite pour ${house.house_id}:*\n${items.join("\n")}`;
}
