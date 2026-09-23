import { env } from "../config/env.js";
import { redis } from "../redis/client.js";

export const APP_OTP_TTL_SEC = env.APP_OTP_TTL_SEC;
export const APP_LOGIN_TRIGGER = "CASA-APP-LOGIN";

/** Digits only, with Rwanda 250 prefix when the user typed a local 07xxxxxxxx number. */
export function canonicalPhone(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("250")) return d;
  if (d.length === 10 && d.startsWith("0")) return `250${d.slice(1)}`;
  if (d.length === 9 && d.startsWith("7")) return `250${d}`;
  return d;
}

export function phoneAliases(raw: string): string[] {
  const digits = raw.replace(/\D/g, "");
  const canonical = canonicalPhone(raw);
  const out = new Set<string>([canonical, digits].filter((p) => p.length >= 7));
  if (canonical.startsWith("250") && canonical.length >= 12) {
    out.add(canonical.slice(3));
    out.add(`0${canonical.slice(3)}`);
  }
  return [...out];
}

export function otpKey(phone: string): string {
  return `casa:login:${canonicalPhone(phone)}`;
}

function otpCodeKey(code: string): string {
  return `casa:login-code:${code.replace(/\D/g, "")}`;
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

export function appLoginWhatsAppUrl(lang: "en" | "fr" = "en"): string {
  const phone = (env.PUBLIC_WHATSAPP_PHONE || "250735496786").replace(/\D/g, "");
  const text =
    lang === "fr"
      ? `${APP_LOGIN_TRIGGER}\nEnvoyez ce message pour recevoir votre code Casa.`
      : `${APP_LOGIN_TRIGGER}\nSend this message to get your Casa login code.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export async function peekLoginOtp(phone: string): Promise<string | null> {
  for (const p of phoneAliases(phone)) {
    const stored = await redis.get(`casa:login:${p}`);
    if (stored) return stored;
  }
  return null;
}

export async function storeLoginOtp(phone: string, otp: string): Promise<void> {
  const aliases = phoneAliases(phone);
  if (aliases.length === 0) return;
  const digits = otp.replace(/\D/g, "");
  const pipe = redis.multi();
  for (const p of aliases) {
    pipe.set(`casa:login:${p}`, digits, "EX", APP_OTP_TTL_SEC);
  }
  if (digits) {
    pipe.set(otpCodeKey(digits), canonicalPhone(phone), "EX", APP_OTP_TTL_SEC);
  }
  await pipe.exec();
}

export async function rememberOtpRequest(phone: string): Promise<void> {
  const p = canonicalPhone(phone);
  if (p.length < 7) return;
  const now = Date.now();
  await redis.zadd("casa:login-recent", now, p);
  await redis.zremrangebyscore("casa:login-recent", 0, now - APP_OTP_TTL_SEC * 1000);
  await redis.expire("casa:login-recent", APP_OTP_TTL_SEC);
}

/** Same code for personal vs Business WhatsApp when only one login is in flight. */
export async function otpForInboundWhatsApp(senderPhone: string): Promise<string> {
  const existing = await peekLoginOtp(senderPhone);
  if (existing) {
    await storeLoginOtp(senderPhone, existing);
    return existing;
  }

  const now = Date.now();
  const windowMs = 3 * 60 * 1000;
  await redis.zremrangebyscore("casa:login-recent", 0, now - windowMs);
  const recent = await redis.zrangebyscore("casa:login-recent", now - windowMs, now);
  const others = recent.filter((p) => canonicalPhone(p) !== canonicalPhone(senderPhone));
  if (others.length === 1) {
    const borrowed = await peekLoginOtp(others[0]);
    if (borrowed) {
      await storeLoginOtp(senderPhone, borrowed);
      return borrowed;
    }
  }

  const otp = generateOTP();
  await storeLoginOtp(senderPhone, otp);
  return otp;
}

async function clearLoginOtp(phone: string, code: string): Promise<void> {
  const pipe = redis.multi();
  for (const q of phoneAliases(phone)) pipe.del(`casa:login:${q}`);
  const digits = code.replace(/\D/g, "");
  if (digits) pipe.del(otpCodeKey(digits));
  await pipe.exec().catch(() => undefined);
}

export async function consumeLoginOtp(
  phone: string,
  code: string
): Promise<{ status: "ok" | "mismatch" | "missing"; phone?: string }> {
  const want = code.replace(/\D/g, "");
  if (want.length < 4) return { status: "missing" };

  for (const p of phoneAliases(phone)) {
    const stored = await redis.get(`casa:login:${p}`);
    if (stored && stored.replace(/\D/g, "") === want) {
      await clearLoginOtp(p, want);
      return { status: "ok", phone: canonicalPhone(p) };
    }
  }

  const owner = await redis.get(otpCodeKey(want));
  if (owner) {
    const stored = await peekLoginOtp(owner);
    if (stored && stored.replace(/\D/g, "") === want) {
      await clearLoginOtp(owner, want);
      return { status: "ok", phone: canonicalPhone(owner) };
    }
  }

  const anyForPhone = await peekLoginOtp(phone);
  return { status: anyForPhone ? "mismatch" : "missing" };
}

export function loginOtpMessage(otp: string, lang: "en" | "fr"): string {
  return lang === "fr"
    ? `🔐 *Code Casa : ${otp}*\n\nValide ${Math.round(APP_OTP_TTL_SEC / 60)} minutes. Ne le partagez avec personne.\n\nRevenez dans l'app et entrez ce code.`
    : `🔐 *Casa login code: ${otp}*\n\nValid for ${Math.round(APP_OTP_TTL_SEC / 60)} minutes. Do not share this code.\n\nGo back to the app and enter this code.`;
}
