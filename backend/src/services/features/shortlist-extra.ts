import { query } from "../../db/pool.js";

export async function removeFromShortlist(
  tenantPhone: string,
  houseId: string
): Promise<number> {
  await query(`DELETE FROM shortlists WHERE tenant_phone = $1 AND house_id = $2`, [
    tenantPhone,
    houseId,
  ]);
  const count = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM shortlists WHERE tenant_phone = $1`,
    [tenantPhone]
  );
  return parseInt(count.rows[0].count, 10);
}

export async function deactivateSavedSearch(
  tenantPhone: string,
  searchId: string
): Promise<boolean> {
  const result = await query(
    `UPDATE saved_searches SET active = FALSE WHERE id = $1 AND tenant_phone = $2`,
    [searchId, tenantPhone]
  );
  return (result.rowCount ?? 0) > 0;
}
