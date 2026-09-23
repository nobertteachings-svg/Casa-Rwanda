export interface AppReviewCredential {
  phone: string;
  otp: string;
  label: "tenant" | "landlord";
}

function normalizePhone(raw: string | undefined): string | null {
  const digits = raw?.replace(/\D/g, "") ?? "";
  return digits.length >= 7 ? digits : null;
}

function normalizeOtp(raw: string | undefined): string | null {
  const otp = raw?.trim() ?? "";
  return /^\d{6}$/.test(otp) ? otp : null;
}

/** Store review / QA login pairs configured via environment variables. */
export function getAppReviewCredentials(): AppReviewCredential[] {
  const pairs: Array<[string | undefined, string | undefined, AppReviewCredential["label"]]> = [
    [process.env.APP_REVIEW_PHONE, process.env.APP_REVIEW_OTP, "tenant"],
    [process.env.APP_REVIEW_PHONE_2, process.env.APP_REVIEW_OTP_2, "landlord"],
  ];

  const out: AppReviewCredential[] = [];
  for (const [phoneRaw, otpRaw, label] of pairs) {
    const phone = normalizePhone(phoneRaw);
    const otp = normalizeOtp(otpRaw);
    if (phone && otp) out.push({ phone, otp, label });
  }
  return out;
}

export function findAppReviewCredential(phone: string): AppReviewCredential | null {
  const normalized = phone.replace(/\D/g, "");
  return getAppReviewCredentials().find((c) => c.phone === normalized) ?? null;
}

export function isAppReviewBypass(phone: string, code: string): boolean {
  const cred = findAppReviewCredential(phone);
  return Boolean(cred && cred.otp === code.trim());
}

export function appReviewOtpForPhone(phone: string): string | null {
  return findAppReviewCredential(phone)?.otp ?? null;
}

export function isAppReviewPhone(phone: string): boolean {
  return findAppReviewCredential(phone) !== null;
}
