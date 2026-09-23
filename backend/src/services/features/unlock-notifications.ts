import type { Language } from "../../i18n/messages.js";
import type { House } from "../houses.js";
import { formatHouseSummary } from "../houses.js";
import { findUser } from "../users.js";
import { sendTextMessage } from "../whatsapp.js";

export async function notifyLandlordOfUnlock(
  house: House,
  tenantPhone: string
): Promise<void> {
  const landlord = await findUser(house.landlord_phone);
  const lang = (landlord?.language ?? "en") as Language;

  const message =
    lang === "fr"
      ? `🔔 *Nouveau locataire intéressé !*\n\n` +
        `Quelqu'un a demandé votre contact pour:\n${formatHouseSummary(house, lang)}\n\n` +
        `Numéro locataire: ${tenantPhone}\n\n` +
        `Attendez-vous à un appel ou message WhatsApp bientôt.`
      : `🔔 *New tenant interested!*\n\n` +
        `Someone requested your contact for:\n${formatHouseSummary(house, lang)}\n\n` +
        `Tenant number: ${tenantPhone}\n\n` +
        `Expect a call or WhatsApp message soon.`;

  await sendTextMessage(house.landlord_phone, message);
}
