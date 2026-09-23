import { env } from "../../config/env.js";
import { query } from "../../db/pool.js";

export async function checkUnlockAllowed(
  tenantPhone: string
): Promise<{ allowed: boolean; usedToday: number; limit: number }> {
  const limit = env.DAILY_UNLOCK_LIMIT;
  const result = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM unlocks
     WHERE tenant_phone = $1 AND paid_at >= CURRENT_DATE`,
    [tenantPhone]
  );
  const usedToday = parseInt(result.rows[0]?.count ?? "0", 10);
  return { allowed: usedToday < limit, usedToday, limit };
}
