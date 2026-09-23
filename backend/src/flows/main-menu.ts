import { t } from "../i18n/index.js";
import type { Language, UserRole } from "../i18n/messages.js";
import { setSession } from "../redis/client.js";
import { sendMenuMessage, sendTextMessage } from "../services/transport.js";
import { startRegistration } from "./registration.js";
import { showTenantSubmenu, showUnlockedContacts } from "./tenant-features.js";
import { showLandlordSubmenu } from "./landlord-features.js";
import { showLandlordListingManager } from "./landlord-listings.js";
import {
  categoryMenuOptions,
  listingModeMenuOptions,
  mainMenuOptions,
  menuButtonLabel,
} from "./menu-options.js";

const DEFAULT_LANG: Language = "en";

export async function showMainMenu(
  phone: string,
  role: UserRole,
  _lang: Language = DEFAULT_LANG
): Promise<void> {
  const lang = DEFAULT_LANG;
  const header =
    "🏡 *Landlord Menu*\n\n🪪 ID verification required before listing\n🎥 Video walkthrough required\n💡 Voice notes welcome";
  const tenantHeader =
    "🔍 *Tenant Menu*\n\n💡 Voice notes welcome";

  await sendMenuMessage(
    phone,
    role === "landlord" ? header : tenantHeader,
    mainMenuOptions(role, lang),
    menuButtonLabel(lang)
  );
  await setSession(phone, {
    flow: "main_menu",
    step: "idle",
    language: lang,
    data: { role },
  });
}

export async function handleMainMenu(
  phone: string,
  text: string,
  _lang: Language,
  role: UserRole
): Promise<void> {
  const lang = DEFAULT_LANG;
  const m = t(lang);
  const choice = text.trim();

  if (choice === "4" || choice.toLowerCase() === "help" || choice.toLowerCase() === "aide") {
    await sendTextMessage(phone, m.help);
    await showMainMenu(phone, role, lang);
    return;
  }

  if (role === "landlord") {
    if (choice === "1") {
      await setSession(phone, {
        flow: "landlord_listing",
        step: "mode",
        language: lang,
        data: {},
      });
      await sendMenuMessage(
        phone,
        "How would you like to list?",
        listingModeMenuOptions(lang),
        menuButtonLabel(lang)
      );
      return;
    }
    if (choice === "2") {
      await showLandlordListingManager(phone, lang);
      return;
    }
    if (choice === "3") {
      await showLandlordSubmenu(phone, lang);
      return;
    }
  }

  if (role === "tenant") {
    if (choice === "1") {
      await setSession(phone, {
        flow: "tenant_search",
        step: "category",
        language: lang,
        data: {},
      });
      await sendMenuMessage(
        phone,
        "Looking for:",
        categoryMenuOptions(lang),
        menuButtonLabel(lang)
      );
      return;
    }
    if (choice === "2") {
      await showUnlockedContacts(phone, lang);
      await showMainMenu(phone, role, lang);
      return;
    }
    if (choice === "3") {
      await showTenantSubmenu(phone, lang);
      return;
    }
  }

  await sendTextMessage(phone, m.invalidChoice);
  await showMainMenu(phone, role, lang);
}

/** Legacy settings/language flow — always return to English main menu. */
export async function handleSettings(
  phone: string,
  _text: string,
  _lang: Language,
  role: UserRole
): Promise<void> {
  await showMainMenu(phone, role, DEFAULT_LANG);
}

export { startRegistration };
