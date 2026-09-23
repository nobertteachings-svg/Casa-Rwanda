import { query } from "../db/pool.js";

export async function upsertDeviceToken(
  phone: string,
  expoPushToken: string,
  platform?: string
): Promise<void> {
  await query(
    `INSERT INTO device_tokens (phone, expo_push_token, platform, active, updated_at)
     VALUES ($1, $2, $3, TRUE, NOW())
     ON CONFLICT (phone, expo_push_token)
     DO UPDATE SET platform = EXCLUDED.platform, active = TRUE, updated_at = NOW()`,
    [phone, expoPushToken, platform ?? null]
  );
}

export async function deactivateDeviceToken(phone: string, expoPushToken: string): Promise<void> {
  await query(
    `UPDATE device_tokens SET active = FALSE, updated_at = NOW()
     WHERE phone = $1 AND expo_push_token = $2`,
    [phone, expoPushToken]
  );
}

export async function deactivateAllDeviceTokens(phone: string): Promise<void> {
  await query(
    `UPDATE device_tokens SET active = FALSE, updated_at = NOW() WHERE phone = $1`,
    [phone]
  );
}

export async function getActiveDeviceTokens(phone: string): Promise<string[]> {
  const result = await query<{ expo_push_token: string }>(
    `SELECT expo_push_token FROM device_tokens WHERE phone = $1 AND active = TRUE`,
    [phone]
  );
  return result.rows.map((r) => r.expo_push_token);
}

export async function removeInvalidToken(expoPushToken: string): Promise<void> {
  await query(`UPDATE device_tokens SET active = FALSE WHERE expo_push_token = $1`, [
    expoPushToken,
  ]);
}
