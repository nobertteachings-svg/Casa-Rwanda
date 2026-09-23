import { query } from "../../db/pool.js";

/** Bulk activate/deactivate all listings for a landlord (owner managing their own units). */
export async function bulkUpdateListingStatus(
  landlordPhone: string,
  status: "active" | "inactive"
): Promise<number> {
  const result = await query(
    `UPDATE houses SET status = $2, updated_at = NOW()
     WHERE landlord_phone = $1`,
    [landlordPhone, status]
  );
  return result.rowCount ?? 0;
}
