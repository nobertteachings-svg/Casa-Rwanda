import { env } from "../config/env.js";
import { redis } from "../redis/client.js";

export const APP_OTP_TTL_SEC = env.APP_OTP_TTL_SEC;
export const APP_LOGIN_TRIGGER = "CASA-APP-LOGIN";

export function otpKey(phone: string): string {
  return `casa:login:${phone.replace(/\D/g, "")}`;
}

export function generateOTP(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function isAppLoginTrigger(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  return (
    t.includes("casa-app-login") ||
    t.includes("app login code") ||
    t.includes("code de connexion") ||
    t.includes("send my app login") ||
    t.includes("envoyer mon code") ||
    t === "casa login" ||
    t === "code app"
  );
}

/** Store-app fallback: they already requested a code, then opened WhatsApp with Hi / sign up. */
export function isPendingOtpFollowup(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  if (isAppLoginTrigger(t)) return true;
  if (["hi", "hello", "bonjour", "salut", "menu", "start"].includes(t)) return true;
  return /want to sign up|je veux m['’]?inscrire|ouvrir casa/i.test(t);
}

export function appLoginWhatsAppUrl(_lang: "en" | "fr" = "en"): string {
  const phone = (env.PUBLIC_WHATSAPP_PHONE || "250700000000").replace(/\D/g, "");
  const text = `${APP_LOGIN_TRIGGER}\nSend this message to get your Casa login code.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export async function peekLoginOtp(phone: string): Promise<string | null> {
  return redis.get(otpKey(phone.replace(/\D/g, "")));
}

export async function storeLoginOtp(phone: string, otp: string): Promise<void> {
  await redis.set(otpKey(phone.replace(/\D/g, "")), otp, "EX", APP_OTP_TTL_SEC);
}

export function loginOtpMessage(otp: string, _lang: "en" | "fr"): string {
  return `🔐 *Casa login code: ${otp}*\n\nValid for ${Math.round(APP_OTP_TTL_SEC / 60)} minutes. Do not share this code.\n\nGo back to the app and enter this code.`;
}
