import type { Language } from "../i18n/messages.js";
import { getSession, setSession } from "../redis/client.js";
import { findUser, isUserSuspended, syncWhatsAppDisplayName } from "../services/users.js";
import type { IncomingMessage } from "../services/whatsapp.js";
import { markAsRead, sendTextMessage } from "../services/transport.js";
import {
  isAppLoginTrigger,
  isPendingOtpFollowup,
  loginOtpMessage,
  otpForInboundWhatsApp,
  peekLoginOtp,
} from "../services/app-otp.js";
import { processVoiceNote } from "../services/features/voice.js";
import { handleLandlordListing } from "./landlord-listing.js";
import {
  handleMainMenu,
  handleSettings,
  showMainMenu,
  startRegistration,
} from "./main-menu.js";
import { handleTenantSearch } from "./tenant-search.js";
import { handleRegistration } from "./registration.js";
import { handleTenantExtras } from "./tenant-features.js";
import { handleLandlordExtras } from "./landlord-features.js";
import { handleLandlordListings } from "./landlord-listings.js";
import { handleLandlordIdVerification } from "./landlord-verify-id.js";

async function resolveMessageText(
  message: IncomingMessage,
  lang: Language
): Promise<{ text: string; type: string }> {
  if (message.type === "audio" && message.audioId) {
    const { text, notice } = await processVoiceNote(message.audioId, lang);
    if (notice) await sendTextMessage(message.from, notice);
    return { text: text ?? "", type: "audio" };
  }
  const choice = message.choiceId ?? message.text?.trim() ?? "";
  return { text: choice, type: message.type };
}

export async function routeMessage(message: IncomingMessage): Promise<void> {
  const phone = message.from;
  const whatsappName = message.name?.trim();

  if (message.id && !message.id.startsWith("sim-")) {
    await markAsRead(message.id).catch((err) => {
      console.warn("markAsRead failed:", err);
    });
  }

  const user = await findUser(phone);
  if (whatsappName) {
    if (user) {
      await syncWhatsAppDisplayName(phone, whatsappName);
    }
  }

  const session = await getSession(phone);
  if (whatsappName && !user) {
    const base = session ?? { flow: "registration" as const, step: "welcome", data: {} };
    if (!session?.data?.whatsapp_name) {
      await setSession(phone, {
        ...base,
        data: { ...base.data, whatsapp_name: whatsappName },
      });
    }
  }

  if (user && (await isUserSuspended(phone))) {
    await sendTextMessage(
      phone,
      "Your Casa Rwanda account is temporarily suspended. Contact support if you believe this is a mistake."
    );
    return;
  }

  // Casa Rwanda is English-only — never prompt for language.
  const lang: Language = "en";
  if (session && session.language !== "en") {
    await setSession(phone, { ...session, language: "en" });
    session.language = "en";
  }

  const { text, type: resolvedType } = await resolveMessageText(message, lang);
  const effectiveType =
    message.type === "location" ? "location" : message.type === "video" ? "video" : message.type === "image" ? "image" : resolvedType;

  if (isAppLoginTrigger(text) || (isPendingOtpFollowup(text) && (await peekLoginOtp(phone)))) {
    let otp: string;
    try {
      otp = await otpForInboundWhatsApp(phone);
    } catch (err) {
      console.warn("otpForInboundWhatsApp failed:", err);
      await sendTextMessage(
        phone,
        "Could not create a code right now. Open the Casa app and tap Send code again."
      );
      return;
    }
    await sendTextMessage(phone, loginOtpMessage(otp, "en"));
    return;
  }

  if (["menu", "start", "hi", "hello"].includes(text.toLowerCase())) {
    if (user) {
      await showMainMenu(phone, user.role, lang);
    } else {
      await startRegistration(phone);
    }
    return;
  }

  if (!user) {
    if (session?.flow === "registration") {
      await handleRegistration(phone, text, session);
    } else {
      await startRegistration(phone);
    }
    return;
  }

  const flow = session?.flow ?? "main_menu";
  const location =
    message.latitude !== undefined && message.longitude !== undefined
      ? { latitude: message.latitude, longitude: message.longitude }
      : undefined;

  switch (flow) {
    case "registration":
      await handleRegistration(phone, text, session!);
      break;

    case "main_menu":
      await handleMainMenu(phone, text, lang, user.role);
      break;

    case "settings":
      await handleSettings(phone, text, lang, user.role);
      break;

    case "landlord_listing":
      await handleLandlordListing(phone, text, session!, effectiveType, location, message);
      break;

    case "tenant_search":
      await handleTenantSearch(phone, text, session!, effectiveType, location);
      break;

    case "tenant_extras":
      await handleTenantExtras(phone, text, session!);
      break;

    case "landlord_extras":
      await handleLandlordExtras(phone, text, session!);
      break;

    case "landlord_listings":
      await handleLandlordListings(phone, text, session!);
      break;

    case "landlord_verify_id":
      await handleLandlordIdVerification(phone, text, session!, effectiveType, message);
      break;

    default:
      await showMainMenu(phone, user.role, lang);
  }
}
