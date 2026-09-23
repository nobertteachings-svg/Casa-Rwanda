import { query } from "../../db/pool.js";

export async function requestVerification(
  phone: string,
  method: "id" | "bank"
): Promise<void> {
  await query(
    `UPDATE users SET verification_method = $2, updated_at = NOW() WHERE phone = $1`,
    [phone, method]
  );
}

export async function approveVerification(phone: string): Promise<void> {
  await query(
    `UPDATE users SET verified = TRUE, verified_at = NOW(), updated_at = NOW()
     WHERE phone = $1`,
    [phone]
  );
}

export async function isVerified(phone: string): Promise<boolean> {
  const result = await query<{ verified: boolean }>(
    `SELECT verified FROM users WHERE phone = $1`,
    [phone]
  );
  return result.rows[0]?.verified ?? false;
}

export function verifiedBadge(_lang: "en" | "fr", verified: boolean): string {
  if (!verified) return "";
  return " ✅ Verified tenant";
}
