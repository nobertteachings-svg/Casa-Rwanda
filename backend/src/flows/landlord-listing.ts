import { t } from "../i18n/index.js";
import type { Language } from "../i18n/messages.js";
import {
  categoryLabel,
  formatElectricityMeterMenu,
  formatFacilitiesSummary,
  formatRegionMenu,
  formatSubtypeMenu,
  isSaleCategory,
  legacyTypeFromSubtype,
  listingPriceSuffix,
  parseCategoryChoice,
  parseElectricityMeterChoice,
  parseRegionChoice,
  parseSubtypeChoice,
  regionLabel,
  subtypeLabel,
  type ElectricityMeter,
  type PropertyCategory,
} from "../constants/property-taxonomy.js";
import { setSession, type FlowState } from "../redis/client.js";
import { parseListingFromText } from "../services/claude.js";
import { createHouse } from "../services/houses.js";
import { sendMenuMessage, sendTextMessage } from "../services/transport.js";
import type { IncomingMessage } from "../services/whatsapp.js";
import {
  isCloudinaryConfigured,
  persistWhatsAppMedia,
} from "../services/features/cloudinary-media.js";
import { showMainMenu } from "./main-menu.js";
import { requireLandlordVerification } from "./landlord-verify-id.js";
import {
  listingModeMenuOptions,
  menuButtonLabel,
  propertyCategoryMenuOptions,
} from "./menu-options.js";

type ListingDraft = {
  type?: string;
  property_category?: PropertyCategory;
  property_subtype?: string;
  region?: string;
  town?: string;
  rent?: number;
  months_upfront?: number;
  latitude?: number;
  longitude?: number;
  neighbourhood?: string;
  city?: string;
  fenced?: boolean;
  water?: boolean;
  borehole?: boolean;
  parking?: boolean;
  electricity_meter?: ElectricityMeter;
  furnished?: boolean;
  security?: boolean;
  standby_generator?: boolean;
  photos?: string[];
  videos?: string[];
  trust_tier?: string;
  ai_description?: string;
  mode?: "ai" | "steps";
};

const FACILITY_STEPS = [
  "fenced",
  "parking",
  "standby_generator",
  "borehole",
  "water",
  "electricity_meter",
  "furnished",
  "security",
] as const;

const FACILITY_PROMPTS: Record<string, { en: string; fr: string }> = {
  fenced: { en: "Gated / fenced compound? YES or NO", fr: "Clôturé / sécurisé ? OUI ou NON" },
  parking: { en: "Parking space? YES or NO", fr: "Parking ? OUI ou NON" },
  standby_generator: {
    en: "Backup power / generator? YES or NO",
    fr: "Alimentation de secours / générateur ? OUI ou NON",
  },
  borehole: { en: "Water tank or borehole? YES or NO", fr: "Citerne ou forage ? OUI ou NON" },
  water: { en: "Running water (WASAC)? YES or NO", fr: "Eau courante (WASAC) ? OUI ou NON" },
  furnished: { en: "Furnished? YES or NO", fr: "Meublé ? OUI ou NON" },
  security: { en: "Security guard on site? YES or NO", fr: "Gardien sur place ? OUI ou NON" },
};

function parseYesNo(input: string): boolean | null {
  const n = input.trim().toLowerCase();
  if (["yes", "y", "oui", "1"].includes(n)) return true;
  if (["no", "n", "non", "2"].includes(n)) return false;
  return null;
}

function formatDraftSummary(draft: ListingDraft, lang: Language): string {
  const lines: string[] = [];
  if (draft.property_category) {
    lines.push(
      lang === "fr" ? `Catégorie: ${categoryLabel(draft.property_category, lang)}` : `Category: ${categoryLabel(draft.property_category, lang)}`
    );
  }
  if (draft.property_subtype) {
    lines.push(
      lang === "fr"
        ? `Type: ${subtypeLabel(draft.property_subtype, lang)}`
        : `Type: ${subtypeLabel(draft.property_subtype, lang)}`
    );
  }
  const sale = isSaleCategory(draft.property_category);
  lines.push(
    sale
      ? lang === "fr"
        ? `Prix: ${draft.rent?.toLocaleString() ?? "?"} ${listingPriceSuffix(draft.property_category, lang)}`
        : `Price: ${draft.rent?.toLocaleString() ?? "?"} ${listingPriceSuffix(draft.property_category, lang)}`
      : lang === "fr"
        ? `Loyer: ${draft.rent?.toLocaleString() ?? "?"} RWF/mois`
        : `Rent: ${draft.rent?.toLocaleString() ?? "?"} RWF/month`
  );
  if (!sale) {
    lines.push(
      lang === "fr"
        ? `Avance: ${draft.months_upfront ?? "?"} mois`
        : `Upfront: ${draft.months_upfront ?? "?"} months`
    );
  }
  const locationParts = [draft.neighbourhood, draft.town, draft.region ? regionLabel(draft.region, lang) : null]
    .filter(Boolean)
    .join(", ");
  lines.push(lang === "fr" ? `Lieu: ${locationParts || "?"}` : `Location: ${locationParts || "?"}`);
  lines.push(formatFacilitiesSummary(draft, lang));
  if (draft.ai_description) lines.push(`\n${draft.ai_description}`);
  const videoStatus =
    (draft.videos?.length ?? 0) > 0
      ? lang === "fr"
        ? "Vidéo: ✅"
        : "Video: ✅"
      : lang === "fr"
        ? "Vidéo: ❌ requise"
        : "Video: ❌ required";
  lines.push(videoStatus);
  const header = lang === "fr" ? "*Aperçu de l'annonce:*" : "*Listing preview:*";
  return `${header}\n\n${lines.join("\n")}`;
}

function nextAddressStep(draft: ListingDraft): "region" | "town" | "quarter" | "location" {
  if (!draft.region) return "region";
  if (!draft.town) return "town";
  if (!draft.neighbourhood) return "quarter";
  return "location";
}

async function promptAddressStep(
  phone: string,
  draft: ListingDraft,
  lang: Language,
  step: "region" | "town" | "quarter" | "location"
): Promise<void> {
  await setSession(phone, {
    flow: "landlord_listing",
    step,
    language: lang,
    data: draft,
  });

  if (step === "region") {
    await sendTextMessage(phone, formatRegionMenu(lang));
    return;
  }
  if (step === "town") {
    await sendTextMessage(
      phone,
      lang === "fr"
        ? "Tapez le nom de la ville (ex: Kigali, Musanze, Huye, Rubavu)."
        : "Type the town name (e.g. Kigali, Musanze, Huye, Rubavu)."
    );
    return;
  }
  if (step === "quarter") {
    await sendTextMessage(
      phone,
      lang === "fr"
        ? "Tapez le nom du quartier (ex: Kimironko, Remera, Kacyiru)."
        : "Type the neighbourhood name (e.g. Kimironko, Remera, Kacyiru)."
    );
    return;
  }
  await sendTextMessage(
    phone,
    lang === "fr"
      ? "Maintenant, épinglez la position WhatsApp 📍 du bien (après district, ville et quartier)."
      : "Now pin the WhatsApp location 📍 of the property (after district, town, and neighbourhood)."
  );
}

export async function handleLandlordListing(
  phone: string,
  text: string,
  session: FlowState,
  messageType?: string,
  location?: { latitude: number; longitude: number },
  message?: IncomingMessage
): Promise<void> {
  const lang = (session.language ?? "en") as Language;
  const draft = (session.data as ListingDraft) ?? {};
  const choice = text.trim();

  switch (session.step) {
    case "mode": {
      if (choice === "3") {
        await showMainMenu(phone, "landlord", lang);
        return;
      }
      if (choice === "1") {
        if (!(await requireLandlordVerification(phone, lang))) return;
        await setSession(phone, {
          flow: "landlord_listing",
          step: "ai_description",
          language: lang,
          data: { ...draft, mode: "ai" },
        });
        const prompt =
          lang === "fr"
            ? "Décrivez votre bien librement (location, maison à vendre ou terrain, type, district, ville, quartier, prix, facilités...)"
            : "Describe your property freely (rent, house for sale or land, type, district, town, neighbourhood, price, facilities...)";
        await sendTextMessage(phone, prompt);
        return;
      }
      if (choice === "2") {
        if (!(await requireLandlordVerification(phone, lang))) return;
        await setSession(phone, {
          flow: "landlord_listing",
          step: "category",
          language: lang,
          data: { ...draft, mode: "steps" },
        });
        const prompt = lang === "fr" ? "Type de bien ?" : "Property category?";
        await sendMenuMessage(phone, prompt, propertyCategoryMenuOptions(lang), menuButtonLabel(lang));
        return;
      }
      await sendTextMessage(phone, t(lang).invalidChoice);
      await sendMenuMessage(
        phone,
        lang === "fr" ? "Comment voulez-vous publier ?" : "How would you like to list?",
        listingModeMenuOptions(lang),
        menuButtonLabel(lang)
      );
      return;
    }

    case "ai_description": {
      const parsed = await parseListingFromText(text, lang);
      if (!parsed) {
        await sendTextMessage(
          phone,
          lang === "fr"
            ? "Je n'ai pas pu analyser. Réessayez avec plus de détails (catégorie, type, district, ville, quartier, loyer)."
            : "Couldn't parse that. Try again with category, type, district, town, neighbourhood, and price."
        );
        return;
      }
      const updated: ListingDraft = {
        ...draft,
        property_category: parsed.property_category,
        property_subtype: parsed.property_subtype,
        type: legacyTypeFromSubtype(parsed.property_subtype),
        region: parsed.region,
        town: parsed.town,
        rent: parsed.rent,
        months_upfront: isSaleCategory(parsed.property_category) ? 0 : parsed.months_upfront,
        neighbourhood: parsed.neighbourhood,
        city: parsed.town ?? parsed.city,
        fenced: parsed.fenced,
        water: parsed.water,
        borehole: parsed.borehole,
        parking: parsed.parking,
        electricity_meter: parsed.electricity_meter,
        furnished: parsed.furnished,
        security: parsed.security,
        standby_generator: parsed.standby_generator,
        ai_description: parsed.description,
      };
      await sendTextMessage(phone, formatDraftSummary(updated, lang));
      const next = nextAddressStep(updated);
      await promptAddressStep(phone, updated, lang, next);
      return;
    }

    case "category": {
      const category = parseCategoryChoice(choice);
      if (!category) {
        await sendTextMessage(phone, t(lang).invalidChoice);
        await sendMenuMessage(
          phone,
          lang === "fr" ? "Type de bien ?" : "Property category?",
          propertyCategoryMenuOptions(lang),
          menuButtonLabel(lang)
        );
        return;
      }
      draft.property_category = category;
      await setSession(phone, {
        flow: "landlord_listing",
        step: "subtype",
        language: lang,
        data: draft,
      });
      await sendTextMessage(phone, formatSubtypeMenu(category, lang));
      return;
    }

    case "subtype": {
      const category = draft.property_category!;
      const subtype = parseSubtypeChoice(choice, category);
      if (!subtype) {
        await sendTextMessage(phone, t(lang).invalidChoice);
        return;
      }
      draft.property_subtype = subtype;
      draft.type = legacyTypeFromSubtype(subtype);
      await setSession(phone, {
        flow: "landlord_listing",
        step: "rent",
        language: lang,
        data: draft,
      });
      await sendTextMessage(
        phone,
        isSaleCategory(category)
          ? lang === "fr"
            ? "Prix demandé en RWF ?"
            : "Asking price in RWF?"
          : lang === "fr"
            ? "Loyer mensuel en RWF ?"
            : "Monthly rent in RWF?"
      );
      return;
    }

    case "rent": {
      const rent = parseInt(choice.replace(/\D/g, ""), 10);
      if (!rent || rent < 1000) {
        await sendTextMessage(phone, t(lang).invalidChoice);
        return;
      }
      draft.rent = rent;
      if (isSaleCategory(draft.property_category)) {
        draft.months_upfront = 0;
        await promptAddressStep(phone, draft, lang, "region");
        return;
      }
      await setSession(phone, {
        flow: "landlord_listing",
        step: "months_upfront",
        language: lang,
        data: draft,
      });
      await sendTextMessage(
        phone,
        lang === "fr" ? "Combien de mois d'avance ?" : "Months upfront required?"
      );
      return;
    }

    case "months_upfront": {
      const months = parseInt(choice, 10);
      if (!months || months < 1) {
        await sendTextMessage(phone, t(lang).invalidChoice);
        return;
      }
      draft.months_upfront = months;
      await promptAddressStep(phone, draft, lang, "region");
      return;
    }

    case "region": {
      const region = parseRegionChoice(choice);
      if (!region) {
        await sendTextMessage(phone, t(lang).invalidChoice);
        return;
      }
      draft.region = region;
      await promptAddressStep(phone, draft, lang, "town");
      return;
    }

    case "town": {
      if (choice.length < 2) {
        await sendTextMessage(phone, t(lang).invalidChoice);
        return;
      }
      draft.town = choice;
      draft.city = choice;
      await promptAddressStep(phone, draft, lang, "quarter");
      return;
    }

    case "quarter": {
      if (choice.length < 2) {
        await sendTextMessage(phone, t(lang).invalidChoice);
        return;
      }
      draft.neighbourhood = choice;
      await promptAddressStep(phone, draft, lang, "location");
      return;
    }

    case "location": {
      if (messageType !== "location" || !location) {
        await sendTextMessage(
          phone,
          lang === "fr"
            ? "Veuillez envoyer une position WhatsApp (📎 → Position)."
            : "Please send a WhatsApp location pin (📎 → Location)."
        );
        return;
      }
      draft.latitude = location.latitude;
      draft.longitude = location.longitude;

      if (draft.mode === "ai") {
        draft.photos = [];
        draft.videos = [];
        await setSession(phone, {
          flow: "landlord_listing",
          step: "photos",
          language: lang,
          data: draft,
        });
        await sendTextMessage(
          phone,
          lang === "fr"
            ? "Envoyez jusqu'à 5 photos du bien, puis répondez *FINI*."
            : "Send up to 5 photos of the property, then reply *DONE*."
        );
        return;
      }

      await setSession(phone, {
        flow: "landlord_listing",
        step: "fenced",
        language: lang,
        data: draft,
      });
      await sendTextMessage(
        phone,
        lang === "fr" ? FACILITY_PROMPTS.fenced.fr : FACILITY_PROMPTS.fenced.en
      );
      return;
    }

    case "fenced":
    case "parking":
    case "standby_generator":
    case "borehole":
    case "water":
    case "furnished":
    case "security": {
      const val = parseYesNo(choice);
      if (val === null) {
        await sendTextMessage(phone, t(lang).invalidChoice);
        return;
      }
      draft[session.step as keyof ListingDraft] = val as never;

      const currentIdx = FACILITY_STEPS.indexOf(
        session.step as (typeof FACILITY_STEPS)[number]
      );
      const nextFacility = FACILITY_STEPS[currentIdx + 1];

      if (nextFacility) {
        await setSession(phone, {
          flow: "landlord_listing",
          step: nextFacility,
          language: lang,
          data: draft,
        });
        if (nextFacility === "electricity_meter") {
          await sendTextMessage(phone, formatElectricityMeterMenu(lang));
        } else {
          await sendTextMessage(
            phone,
            lang === "fr"
              ? FACILITY_PROMPTS[nextFacility].fr
              : FACILITY_PROMPTS[nextFacility].en
          );
        }
        return;
      }

      draft.photos = [];
      draft.videos = [];
      await setSession(phone, {
        flow: "landlord_listing",
        step: "photos",
        language: lang,
        data: draft,
      });
      await sendTextMessage(
        phone,
        lang === "fr"
          ? "Envoyez jusqu'à 5 photos, puis répondez FINI"
          : "Send up to 5 photos, then reply DONE"
      );
      return;
    }

    case "electricity_meter": {
      const meter = parseElectricityMeterChoice(choice);
      if (!meter) {
        await sendTextMessage(phone, t(lang).invalidChoice);
        return;
      }
      draft.electricity_meter = meter;

      await setSession(phone, {
        flow: "landlord_listing",
        step: "furnished",
        language: lang,
        data: draft,
      });
      await sendTextMessage(
        phone,
        lang === "fr" ? FACILITY_PROMPTS.furnished.fr : FACILITY_PROMPTS.furnished.en
      );
      return;
    }

    case "photos": {
      if (choice.toLowerCase() === "done" || choice.toLowerCase() === "fini") {
        const photos = draft.photos ?? [];
        if (photos.length === 0) {
          await sendTextMessage(
            phone,
            lang === "fr"
              ? "❌ Envoyez au moins 1 photo avant de continuer."
              : "❌ Please send at least 1 photo before continuing."
          );
          return;
        }
        // When Cloudinary is configured, refuse to continue with only temporary WhatsApp refs.
        if (isCloudinaryConfigured && !photos.some((p) => p.startsWith("cloudinary:"))) {
          await sendTextMessage(
            phone,
            lang === "fr"
              ? "❌ Les photos n'ont pas pu être enregistrées. Renvoyez les photos (connexion stable), puis répondez *FINI*."
              : "❌ Photos could not be saved permanently. Please re-send the photos (stable connection), then reply *DONE*."
          );
          return;
        }
        if (!draft.videos) draft.videos = [];
        await setSession(phone, {
          flow: "landlord_listing",
          step: "video",
          language: lang,
          data: draft,
        });
        await sendTextMessage(
          phone,
          lang === "fr"
            ? "🎥 *Vidéo obligatoire*\n\nEnvoyez une vidéo de visite du bien. Parcourez chaque pièce (cuisine, chambres, salle de bain, cour).\n\nPuis répondez *FINI*."
            : "🎥 *Video required*\n\nSend a walkthrough video of the property. Show every room (kitchen, bedrooms, bathroom, compound).\n\nThen reply *DONE*."
        );
        return;
      }
      if (!draft.photos) draft.photos = [];

      if (messageType === "image" && message?.imageId) {
        const ref = await persistWhatsAppMedia(message.imageId, "image");
        draft.photos.push(ref);
      }

      await setSession(phone, {
        flow: "landlord_listing",
        step: "photos",
        language: lang,
        data: draft,
      });

      await sendTextMessage(
        phone,
        lang === "fr"
          ? `Photo reçue (${draft.photos.length}/5). Envoyez plus ou répondez *FINI* pour passer à la vidéo.`
          : `Photo received (${draft.photos.length}/5). Send more or reply *DONE* to continue to video.`
      );
      return;
    }

    case "video": {
      if (!draft.videos) draft.videos = [];

      if (messageType === "video" && message?.videoId) {
        const ref = await persistWhatsAppMedia(message.videoId, "video");
        draft.videos.push(ref);
        draft.trust_tier = "verified_plus";
      }

      if (choice.toLowerCase() === "done" || choice.toLowerCase() === "fini") {
        if (draft.videos.length === 0) {
          await sendTextMessage(
            phone,
            lang === "fr"
              ? "❌ La vidéo de visite est *obligatoire*. Envoyez une vidéo du bien avant de continuer."
              : "❌ A walkthrough video is *required*. Please send a video of the property before continuing."
          );
          return;
        }
        await setSession(phone, {
          flow: "landlord_listing",
          step: "confirm",
          language: lang,
          data: draft,
        });
        await sendTextMessage(phone, formatDraftSummary(draft, lang));
        await sendTextMessage(
          phone,
          lang === "fr"
            ? "✨ Annonce *Vérifié+* — vidéo confirmée.\n\nPublier ? Répondez *OUI* ou *NON*"
            : "✨ *Verified+* listing — video confirmed.\n\nPublish? Reply *YES* or *NO*"
        );
        return;
      }

      await setSession(phone, {
        flow: "landlord_listing",
        step: "video",
        language: lang,
        data: draft,
      });

      if (draft.videos.length > 0) {
        await sendTextMessage(
          phone,
          lang === "fr"
            ? `✅ Vidéo reçue (${draft.videos.length}). Envoyez une autre vidéo ou répondez *FINI*.`
            : `✅ Video received (${draft.videos.length}). Send another video or reply *DONE*.`
        );
      } else {
        await sendTextMessage(
          phone,
          lang === "fr"
            ? "🎥 Envoyez une *vidéo* (pas une photo) — visite complète du bien requise."
            : "🎥 Send a *video* (not a photo) — full property walkthrough required."
        );
      }
      return;
    }

    case "confirm": {
      const yes = ["yes", "oui", "y", "o"].includes(choice.toLowerCase());
      const no = ["no", "non", "n"].includes(choice.toLowerCase());
      if (no) {
        await showMainMenu(phone, "landlord", lang);
        return;
      }
      if (!yes) {
        await sendTextMessage(phone, t(lang).invalidChoice);
        return;
      }
      if (!(await requireLandlordVerification(phone, lang))) return;
      if (
        !draft.property_category ||
        !draft.property_subtype ||
        !draft.region ||
        !draft.town ||
        !draft.neighbourhood ||
        !draft.rent ||
        !draft.latitude ||
        !draft.longitude
      ) {
        await sendTextMessage(
          phone,
          lang === "fr" ? "Informations incomplètes." : "Listing information incomplete."
        );
        await showMainMenu(phone, "landlord", lang);
        return;
      }
      if (!draft.videos || draft.videos.length === 0) {
        await sendTextMessage(
          phone,
          lang === "fr"
            ? "❌ Vidéo de visite obligatoire. Recommençons l'étape vidéo."
            : "❌ Walkthrough video is required. Let's redo the video step."
        );
        await setSession(phone, {
          flow: "landlord_listing",
          step: "video",
          language: lang,
          data: draft,
        });
        await sendTextMessage(
          phone,
          lang === "fr"
            ? "🎥 Envoyez une vidéo complète du bien, puis répondez *FINI*."
            : "🎥 Send a full property video, then reply *DONE*."
        );
        return;
      }

      const house = await createHouse({
        landlord_phone: phone,
        type: draft.type ?? legacyTypeFromSubtype(draft.property_subtype),
        property_category: draft.property_category,
        property_subtype: draft.property_subtype,
        region: draft.region,
        town: draft.town,
        rent: draft.rent,
        months_upfront: isSaleCategory(draft.property_category)
          ? 0
          : draft.months_upfront ?? 1,
        latitude: draft.latitude,
        longitude: draft.longitude,
        neighbourhood: draft.neighbourhood,
        city: draft.town,
        fenced: draft.fenced,
        water: draft.water,
        borehole: draft.borehole,
        parking: draft.parking,
        electricity_meter: draft.electricity_meter ?? "none",
        furnished: draft.furnished,
        security: draft.security,
        standby_generator: draft.standby_generator,
        photos: draft.photos ?? [],
        videos: draft.videos,
        trust_tier: "verified_plus",
        ai_description: draft.ai_description,
      });

      await sendTextMessage(
        phone,
        lang === "fr"
          ? `✅ Publié ! ID : *${house.house_id}* ✨ Vérifié+`
          : `✅ Listed! House ID: *${house.house_id}* ✨ Verified+`
      );
      await showMainMenu(phone, "landlord", lang);
      return;
    }
  }
}
