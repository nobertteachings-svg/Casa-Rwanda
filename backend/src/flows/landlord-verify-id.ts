import { isWhatsAppConfigured } from "../config/env.js";
import type { Language } from "../i18n/messages.js";
import { setSession, type FlowState } from "../redis/client.js";
import type { IncomingMessage } from "../services/whatsapp.js";
import { sendTextMessage } from "../services/transport.js";
import {
  analyzePreparedSide,
  finalizeLandlordIdVerification,
  isLandlordVerified,
} from "../services/features/landlord-id-verification.js";
import { downloadWhatsAppMedia } from "../services/features/voice.js";
import { showMainMenu } from "./main-menu.js";

async function downloadImage(imageId: string): Promise<Buffer | null> {
  if (!isWhatsAppConfigured) return null;
  return downloadWhatsAppMedia(imageId);
}

export async function startLandlordIdVerification(
  phone: string,
  lang: Language
): Promise<void> {
  const already = await isLandlordVerified(phone);
  if (already) {
    await sendTextMessage(
      phone,
      lang === "fr"
        ? "✅ Votre identité est déjà vérifiée."
        : "✅ Your identity is already verified."
    );
    await showMainMenu(phone, "landlord", lang);
    return;
  }

  await setSession(phone, {
    flow: "landlord_verify_id",
    step: "await_id_photo",
    language: lang,
    data: {},
  });

  await sendTextMessage(
    phone,
    lang === "fr"
      ? "🪪 *Vérification d'identité*\n\nEnvoyez *une seule photo* d'un document où votre *nom* est clairement visible.\n\nExemples acceptés: National ID, passeport, permis, reçu, facture REG ou tout autre document à votre nom.\n\nPas besoin du recto *et* du verso — une photo suffit."
      : "🪪 *Identity verification*\n\nSend *one photo* of any document where your *name* is clearly visible.\n\nAccepted examples: National ID, passport, driver's license, receipt, REG bill / Mobile Money statement, or any other document with your name on it.\n\nNo need for front *and* back — one photo is enough."
  );
}

export async function handleLandlordIdVerification(
  phone: string,
  text: string,
  session: FlowState,
  messageType?: string,
  message?: IncomingMessage
): Promise<void> {
  const lang = (session.language ?? "en") as Language;

  // Back-compat: old front/back sessions collapse to single-photo step
  const step =
    session.step === "await_id_front" ||
    session.step === "await_id_back" ||
    session.step === "await_id_doc"
      ? "await_id_photo"
      : session.step;

  if (step !== "await_id_photo") return;

  if (messageType !== "image" || (!message?.imageId && !message?.mediaRef)) {
    await sendTextMessage(
      phone,
      lang === "fr"
        ? "Veuillez envoyer *une photo* d'un document où votre *nom* est visible."
        : "Please send *one photo* of a document where your *name* is visible."
    );
    return;
  }

  await sendTextMessage(
    phone,
    lang === "fr" ? "🔍 Analyse du document…" : "🔍 Scanning your document…"
  );

  let imageBuffer: Buffer | null = null;
  if (message.mediaRef) {
    const { fetchCloudinaryBuffer } = await import("../services/features/cloudinary-media.js");
    imageBuffer = await fetchCloudinaryBuffer(message.mediaRef);
  } else if (message.imageId) {
    imageBuffer = await downloadImage(message.imageId);
  } else {
    return;
  }

  if (!imageBuffer) {
    await sendTextMessage(
      phone,
      lang === "fr"
        ? "⏳ Photo reçue mais impossible à télécharger. Réessayez."
        : "⏳ Photo received but could not be downloaded. Please try again."
    );
    return;
  }

  const scan = await analyzePreparedSide(imageBuffer, "front");
  if (!scan) {
    await sendTextMessage(
      phone,
      lang === "fr"
        ? "⏳ Impossible d'analyser la photo. Renvoyez une image plus claire où le *nom* se lit bien."
        : "⏳ Could not analyze the photo. Please resend a clearer image where the *name* is readable."
    );
    return;
  }

  const outcome = await finalizeLandlordIdVerification(
    phone,
    message.mediaRef ?? message.imageId!,
    null,
    scan,
    lang
  );
  await sendTextMessage(phone, outcome.message);

  if (outcome.status === "rejected") {
    await setSession(phone, {
      flow: "landlord_verify_id",
      step: "await_id_photo",
      language: lang,
      data: {},
    });
    return;
  }

  await showMainMenu(phone, "landlord", lang);
}

export async function requireLandlordVerification(
  phone: string,
  lang: Language
): Promise<boolean> {
  if (await isLandlordVerified(phone)) return true;

  await sendTextMessage(
    phone,
    lang === "fr"
      ? "⚠️ *Vérification requise*\n\nAvant de publier, envoyez *une photo* d'un document où votre *nom* est visible (National ID, passeport, reçu, etc.)."
      : "⚠️ *Verification required*\n\nBefore listing, send *one photo* of a document where your *name* is visible (National ID, passport, receipt, etc.)."
  );
  await startLandlordIdVerification(phone, lang);
  return false;
}
