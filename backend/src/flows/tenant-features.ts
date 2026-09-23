import { electricityMeterLabel } from "../constants/property-taxonomy.js";
import type { Language } from "../i18n/messages.js";
import { setSession, type FlowState } from "../redis/client.js";
import { parseSearchFromText, compareHouses, generateRentalAgreement } from "../services/claude.js";
import { createSavedSearch } from "../services/features/saved-searches.js";
import { addToShortlist, getShortlist, clearShortlist } from "../services/features/shortlist.js";
import { getUnlockHistory } from "../services/features/unlocks.js";
import { flagListing, reportListingAlreadyRented } from "../services/features/community-flag.js";
import { getRentHeatMapText } from "../services/features/market-intel.js";
import { createReferral, getAvailableCredits } from "../services/features/referrals.js";
import { requestVerification } from "../services/features/verification.js";
import { findHouseById } from "../services/houses.js";
import { sendMenuMessage, sendTextMessage } from "../services/transport.js";
import { showMainMenu } from "./main-menu.js";
import {
  flagReasonOptions,
  menuButtonLabel,
  tenantSubmenuOptions,
  verificationMethodOptions,
} from "./menu-options.js";

export async function handleTenantExtras(
  phone: string,
  text: string,
  session: FlowState
): Promise<void> {
  const lang = (session.language ?? "en") as Language;
  const choice = text.trim();
  const step = session.step;

  if (step === "submenu") {
    switch (choice) {
      case "1":
        await setSession(phone, { flow: "tenant_extras", step: "save_alert", language: lang, data: {} });
        await sendTextMessage(
          phone,
          lang === "fr"
            ? "Décrivez votre logement idéal (quartier, budget, facilités...). Vous serez notifié quand un bien correspond."
            : "Describe your dream home (area, budget, facilities...). You'll be notified when a match appears."
        );
        return;
      case "2": {
        const list = await getShortlist(phone);
        if (list.length < 2) {
          await sendTextMessage(
            phone,
            lang === "fr"
              ? `Votre liste (${list.length}/2 min). Cherchez un logement et répondez *SAVE* sur les détails.`
              : `Your shortlist (${list.length}/2 min). Search homes and reply *SAVE* on details.`
          );
        } else {
          const comparison = await compareHouses(
            list.map((h) => ({
              house_id: h.house_id,
              type: h.type,
              rent: h.rent,
              facilities: [
                h.water && "water",
                h.parking && "parking",
                (h.electricity_meter && h.electricity_meter !== "none"
                  ? electricityMeterLabel(h.electricity_meter, lang)
                  : h.electricity
                    ? "electricity"
                    : null),
              ]
                .filter(Boolean)
                .join(", "),
            })),
            lang
          );
          await sendTextMessage(phone, `⚖️ *Comparison:*\n\n${comparison}`);
          await clearShortlist(phone);
        }
        await showMainMenu(phone, "tenant", lang);
        return;
      }
      case "3":
        await setSession(phone, { flow: "tenant_search", step: "diaspora_phone", language: lang, data: { diaspora: true } });
        await sendTextMessage(
          phone,
          lang === "fr"
            ? "Entrez le numéro WhatsApp du membre de votre famille en Orwanda (ex: 2507...):"
            : "Enter your family member's WhatsApp number in Rwanda (e.g. 2507...):"
        );
        return;
      case "4":
        await setSession(phone, { flow: "tenant_extras", step: "verify_method", language: lang, data: {} });
        await sendMenuMessage(
          phone,
          lang === "fr"
            ? "Vérification locataire — choisissez une méthode, puis envoyez les documents."
            : "Tenant verification — choose a method, then send your documents.",
          verificationMethodOptions(lang),
          menuButtonLabel(lang)
        );
        return;
      case "5":
        await setSession(phone, { flow: "tenant_extras", step: "refer_phone", language: lang, data: {} });
        await sendTextMessage(
          phone,
          lang === "fr"
            ? "Entrez le numéro WhatsApp de la personne à parrainer:"
            : "Enter the WhatsApp number of the person you're referring:"
        );
        return;
      case "6": {
        const map = await getRentHeatMapText();
        await sendTextMessage(phone, map);
        await showMainMenu(phone, "tenant", lang);
        return;
      }
      default:
        await showMainMenu(phone, "tenant", lang);
    }
    return;
  }

  if (step === "save_alert" && text) {
    const parsed = await parseSearchFromText(text, lang);
    await createSavedSearch(phone, text, parsed);
    await sendTextMessage(
      phone,
      lang === "fr" ? "✅ Alerte enregistrée ! Vous serez notifié sur WhatsApp." : "✅ Alert saved! You'll be notified on WhatsApp."
    );
    await showMainMenu(phone, "tenant", lang);
    return;
  }

  if (step === "verify_method") {
    const method = choice === "2" ? "bank" : "id";
    await requestVerification(phone, method);
    await sendTextMessage(
      phone,
      lang === "fr"
        ? "✅ Demande reçue. Envoyez une photo de votre National ID ou confirmez votre compte bancaire. Badge actif après vérification admin."
        : "✅ Request received. Send a National ID/ID photo or confirm your Rwandan bank account. Badge active after admin verification."
    );
    await showMainMenu(phone, "tenant", lang);
    return;
  }

  if (step === "refer_phone" && text) {
    await createReferral(phone, choice.replace(/\D/g, ""));
    await sendTextMessage(
      phone,
      lang === "fr"
        ? "✅ Parrainage enregistré ! Vous recevrez un crédit déblocage gratuit quand ils complètent une transaction."
        : "✅ Referral saved! You'll get a free unlock credit when they complete a transaction."
    );
    await showMainMenu(phone, "tenant", lang);
    return;
  }

  if (step === "flag_pick_reason") {
    const houseId = session.data.house_id as string;
    if (choice === "rented") {
      await reportListingAlreadyRented(houseId, phone);
      await sendTextMessage(
        phone,
        lang === "fr"
          ? "✅ Merci. Cette annonce a été retirée des recherches. Notre équipe informera le propriétaire."
          : "✅ Thanks. This listing was removed from search. We'll notify the landlord."
      );
      await showMainMenu(phone, "tenant", lang);
      return;
    }
    if (choice === "other") {
      await setSession(phone, {
        flow: "tenant_extras",
        step: "flag_reason",
        language: lang,
        data: { house_id: houseId },
      });
      await sendTextMessage(
        phone,
        lang === "fr" ? "Décrivez le problème avec cette annonce:" : "Describe the issue with this listing:"
      );
      return;
    }
    await sendMenuMessage(
      phone,
      lang === "fr" ? "Pourquoi signalez-vous cette annonce ?" : "Why are you reporting this listing?",
      flagReasonOptions(lang),
      menuButtonLabel(lang)
    );
    return;
  }

  if (step === "flag_reason" && text) {
    const houseId = session.data.house_id as string;
    await flagListing(houseId, phone, text);
    await sendTextMessage(
      phone,
      lang === "fr" ? "✅ Signalement envoyé. Notre équipe va examiner cette annonce." : "✅ Report submitted. Our team will review this listing."
    );
    await showMainMenu(phone, "tenant", lang);
    return;
  }
}

export async function showUnlockedContacts(phone: string, lang: Language): Promise<void> {
  const history = await getUnlockHistory(phone);
  if (history.length === 0) {
    await sendTextMessage(
      phone,
      lang === "fr" ? "Aucun contact débloqué pour le moment." : "No unlocked contacts yet."
    );
    return;
  }
  const lines = history
    .slice(0, 10)
    .map((u) => `• *${u.house_id}* — ${u.landlord_phone} (${u.rent?.toLocaleString()} RWF)`)
    .join("\n");
  await sendTextMessage(phone, (lang === "fr" ? "📋 *Contacts débloqués:*\n" : "📋 *Unlocked contacts:*\n") + lines);
}

export async function handleSaveOrFlag(
  phone: string,
  text: string,
  houseId: string,
  lang: Language
): Promise<boolean> {
  const cmd = text.toLowerCase();
  if (cmd === "save" || cmd === "sauver") {
    const count = await addToShortlist(phone, houseId);
    await sendTextMessage(
      phone,
      lang === "fr"
        ? `✅ Ajouté à votre liste (${count}/3). Menu → Comparer quand vous avez 2+.`
        : `✅ Added to shortlist (${count}/3). Menu → Compare when you have 2+.`
    );
    return true;
  }
  if (cmd === "flag" || cmd === "signaler") {
    await setSession(phone, {
      flow: "tenant_extras",
      step: "flag_pick_reason",
      language: lang,
      data: { house_id: houseId },
    });
    await sendMenuMessage(
      phone,
      lang === "fr" ? "Pourquoi signalez-vous cette annonce ?" : "Why are you reporting this listing?",
      flagReasonOptions(lang),
      menuButtonLabel(lang)
    );
    return true;
  }
  if (cmd === "lease" || cmd === "bail") {
    const house = await findHouseById(houseId);
    if (house) {
      const agreement = await generateRentalAgreement(house, phone, lang);
      await sendTextMessage(phone, `📄 *${lang === "fr" ? "Contrat de bail" : "Rental Agreement"}*\n\n${agreement}`);
    }
    return true;
  }
  return false;
}

export async function showTenantSubmenu(phone: string, lang: Language): Promise<void> {
  const credits = await getAvailableCredits(phone);
  const creditNote =
    credits > 0
      ? lang === "fr"
        ? `\n🎁 ${credits} crédit(s) déblocage gratuit`
        : `\n🎁 ${credits} free unlock credit(s)`
      : "";

  const header =
    (lang === "fr" ? "🔧 *Plus d'options*" : "🔧 *More options*") +
    creditNote +
    (lang === "fr" ? "\n\nTapez *MENU* pour retourner" : "\n\nType *MENU* to go back");

  await sendMenuMessage(phone, header, tenantSubmenuOptions(lang), menuButtonLabel(lang));
  await setSession(phone, { flow: "tenant_extras", step: "submenu", language: lang, data: {} });
}
