import { query } from "../../db/pool.js";

export async function recordListingView(
  houseId: string,
  tenantPhone: string
): Promise<void> {
  await query(
    `INSERT INTO listing_views (house_id, tenant_phone) VALUES ($1, $2)`,
    [houseId, tenantPhone]
  );
}

export async function getListingStats(houseId: string, days = 7): Promise<{
  views: number;
  unlocks: number;
}> {
  const result = await query<{ views: string; unlocks: string }>(
    `SELECT
      (SELECT COUNT(*)::text FROM listing_views
       WHERE house_id = $1 AND viewed_at >= NOW() - ($2 || ' days')::interval) AS views,
      (SELECT COUNT(*)::text FROM unlocks
       WHERE house_id = $1 AND paid_at >= NOW() - ($2 || ' days')::interval) AS unlocks`,
    [houseId, String(days)]
  );
  const row = result.rows[0];
  return {
    views: parseInt(row.views, 10),
    unlocks: parseInt(row.unlocks, 10),
  };
}

export async function getLandlordWeeklyDigest(landlordPhone: string): Promise<
  Array<{ house_id: string; views: number; unlocks: number }>
> {
  const houses = await query<{ house_id: string }>(
    `SELECT house_id FROM houses WHERE landlord_phone = $1 AND status = 'active'`,
    [landlordPhone]
  );
  const stats = await Promise.all(
    houses.rows.map(async (h) => ({
      house_id: h.house_id,
      ...(await getListingStats(h.house_id, 7)),
    }))
  );
  return stats;
}
