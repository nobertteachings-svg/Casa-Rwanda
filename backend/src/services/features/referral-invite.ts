import { casaWhatsAppLink } from "../../config/env.js";
import { sendTextMessage } from "../transport.js";

/** Prefill so a friend opens Casa chat with the referrer's number already in the message. */
export function referralSignupPrefill(_lang: "en" | "fr", referralPhone: string): string {
  return `Hi Casa! I want to sign up. My referral number is ${referralPhone}`;
}

/** Short forwardable invite — personalized with this user's referral number in the link. */
export function buildReferralInviteMessage(_lang: "en" | "fr", referralPhone: string): string {
  const link = casaWhatsAppLink(referralSignupPrefill("en", referralPhone));

  return (
    "🏠 *Casa Rwanda* — find or list a home in Rwanda on WhatsApp.\n\n" +
    "• *Tenant:* tap the link → I'm a tenant → search\n" +
    "• *Landlord:* tap the link → I'm a landlord → list\n\n" +
    "➡️ Forward this. Your friend taps here:\n" +
    `${link}`
  );
}

/** Send this user their personal invite to forward to friends. */
export async function sendReferralInvite(
  phone: string,
  lang: "en" | "fr"
): Promise<void> {
  await sendTextMessage(phone, buildReferralInviteMessage(lang, phone));
}
