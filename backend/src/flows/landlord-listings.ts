import type { Language } from "../i18n/messages.js";
import { setSession, type FlowState } from "../redis/client.js";
import {
  findHousesByLandlord,
  findHouseById,
  updateHouseStatusByLandlord,
  type House,
} from "../services/houses.js";
import { sendMenuMessage, sendTextMessage } from "../services/transport.js";
import { showMainMenu } from "./main-menu.js";
import {
  landlordListingActionOptions,
  landlordListingPickerOptions,
  menuButtonLabel,
} from "./menu-options.js";

function statusLabel(status: string, lang: Language): string {
  if (lang === "fr") {
    if (status === "active") return "disponible";
    if (status === "inactive") return "loué / retiré";
    if (status === "flagged") return "signalé";
    if (status === "under_review") return "en revue";
    return status;
  }
  if (status === "active") return "available";
  if (status === "inactive") return "rented / off market";
  if (status === "flagged") return "flagged";
  if (status === "under_review") return "under review";
  return status;
}

async function showListingActions(
  phone: string,
  house: House,
  lang: Language
): Promise<void> {
  const header =
    lang === "fr"
      ? `🏠 *${house.house_id}*\n${house.type} — ${house.rent.toLocaleString()} RWF/mois\nStatut: ${statusLabel(house.status, lang)}`
      : `🏠 *${house.house_id}*\n${house.type} — ${house.rent.toLocaleString()} RWF/month\nStatus: ${statusLabel(house.status, lang)}`;

  await sendMenuMessage(
    phone,
    header,
    landlordListingActionOptions(lang, house.status),
    menuButtonLabel(lang)
  );

  await setSession(phone, {
    flow: "landlord_listings",
    step: "listing_action",
    language: lang,
    data: { house_id: house.house_id, house_status: house.status },
  });
}

export async function showLandlordListingManager(phone: string, lang: Language): Promise<void> {
  const houses = await findHousesByLandlord(phone);
  if (houses.length === 0) {
    await sendTextMessage(
      phone,
      lang === "fr" ? "Vous n'avez pas encore d'annonces." : "You have no listings yet."
    );
    await showMainMenu(phone, "landlord", lang);
    return;
  }

  const header =
    lang === "fr"
      ? "🏘 *Mes annonces*\nChoisissez un bien pour le marquer comme loué ou le réactiver."
      : "🏘 *My listings*\nPick a property to mark as rented or put back on the market.";

  await sendMenuMessage(phone, header, landlordListingPickerOptions(houses, lang), menuButtonLabel(lang));

  await setSession(phone, {
    flow: "landlord_listings",
    step: "pick_listing",
    language: lang,
    data: { house_ids: houses.map((h) => h.house_id) },
  });
}

export async function handleLandlordListings(
  phone: string,
  text: string,
  session: FlowState
): Promise<void> {
  const lang = (session.language ?? "en") as Language;
  const choice = text.trim();

  if (choice.toLowerCase() === "menu") {
    await showMainMenu(phone, "landlord", lang);
    return;
  }

  if (session.step === "pick_listing") {
    const houseId = choice.toUpperCase();
    const house = await findHouseById(houseId);
    if (!house || house.landlord_phone !== phone) {
      await sendTextMessage(
        phone,
        lang === "fr" ? "Annonce introuvable. Choisissez dans la liste." : "Listing not found. Pick from the list."
      );
      await showLandlordListingManager(phone, lang);
      return;
    }
    await showListingActions(phone, house, lang);
    return;
  }

  if (session.step === "listing_action") {
    const houseId = session.data.house_id as string;
    const house = await findHouseById(houseId);
    if (!house || house.landlord_phone !== phone) {
      await showMainMenu(phone, "landlord", lang);
      return;
    }

    if (choice === "rented") {
      const ok = await updateHouseStatusByLandlord(houseId, phone, "inactive");
      await sendTextMessage(
        phone,
        ok
          ? lang === "fr"
            ? `✅ *${houseId}* marqué comme loué. Il n'apparaîtra plus dans les recherches.`
            : `✅ *${houseId}* marked as rented. It won't show in searches anymore.`
          : lang === "fr"
            ? "Impossible de mettre à jour cette annonce."
            : "Couldn't update this listing."
      );
      await showLandlordListingManager(phone, lang);
      return;
    }

    if (choice === "reactivate") {
      const ok = await updateHouseStatusByLandlord(houseId, phone, "active");
      await sendTextMessage(
        phone,
        ok
          ? lang === "fr"
            ? `✅ *${houseId}* réactivé. Les locataires peuvent le voir à nouveau.`
            : `✅ *${houseId}* is live again. Tenants can find it in search.`
          : lang === "fr"
            ? "Impossible de réactiver cette annonce."
            : "Couldn't reactivate this listing."
      );
      await showLandlordListingManager(phone, lang);
      return;
    }

    await showLandlordListingManager(phone, lang);
  }
}
