import { query } from "../../db/pool.js";

export async function flagListing(
  houseId: string,
  tenantPhone: string,
  reason: string
): Promise<void> {
  await query(
    `INSERT INTO listing_reviews (house_id, review_type, severity, message)
     VALUES ($1, 'community_flag', 'warning', $2)`,
    [houseId, `Flagged by ${tenantPhone}: ${reason}`]
  );
  await query(
    `UPDATE houses SET status = 'flagged', updated_at = NOW()
     WHERE house_id = $1 AND status = 'active'`,
    [houseId]
  );
}

/** Tenant reports a listing that is still live but already rented — hide immediately. */
export async function reportListingAlreadyRented(
  houseId: string,
  tenantPhone: string
): Promise<boolean> {
  await query(
    `INSERT INTO listing_reviews (house_id, review_type, severity, message)
     VALUES ($1, 'community_flag', 'warning', $2)`,
    [houseId, `Already rented — reported by ${tenantPhone}`]
  );
  const result = await query(
    `UPDATE houses SET status = 'inactive', updated_at = NOW()
     WHERE house_id = $1 AND status = 'active'`,
    [houseId]
  );
  return (result.rowCount ?? 0) > 0;
}
