import { query } from "../../db/pool.js";

export async function createReferral(
  referrerPhone: string,
  referredPhone: string
): Promise<void> {
  await query(
    `INSERT INTO referrals (referrer_phone, referred_phone)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [referrerPhone, referredPhone]
  );
  await query(
    `UPDATE users SET referred_by = $1 WHERE phone = $2 AND referred_by IS NULL`,
    [referrerPhone, referredPhone]
  );
}

export async function completeReferralReward(referredPhone: string): Promise<void> {
  const ref = await query<{ referrer_phone: string; id: string }>(
    `SELECT id, referrer_phone FROM referrals
     WHERE referred_phone = $1 AND status = 'pending'`,
    [referredPhone]
  );
  if (!ref.rows[0]) return;

  await query(
    `UPDATE referrals SET status = 'completed', rewarded_at = NOW() WHERE id = $1`,
    [ref.rows[0].id]
  );

  await query(
    `INSERT INTO credits (user_phone, credit_type, expires_at)
     VALUES ($1, 'free_unlock', NOW() + INTERVAL '90 days')`,
    [ref.rows[0].referrer_phone]
  );
}

export async function getAvailableCredits(userPhone: string): Promise<number> {
  const result = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM credits
     WHERE user_phone = $1 AND used = FALSE
     AND (expires_at IS NULL OR expires_at > NOW())`,
    [userPhone]
  );
  return parseInt(result.rows[0].count, 10);
}
