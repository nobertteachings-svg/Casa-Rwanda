import { query } from "../../db/pool.js";
import type { House } from "../houses.js";

export async function addToShortlist(
  tenantPhone: string,
  houseId: string
): Promise<number> {
  await query(
    `INSERT INTO shortlists (tenant_phone, house_id) VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [tenantPhone, houseId]
  );
  const count = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM shortlists WHERE tenant_phone = $1`,
    [tenantPhone]
  );
  return parseInt(count.rows[0].count, 10);
}

export async function getShortlist(tenantPhone: string): Promise<House[]> {
  const result = await query<House>(
    `SELECT h.* FROM shortlists s
     JOIN houses h ON h.house_id = s.house_id
     WHERE s.tenant_phone = $1
     ORDER BY s.added_at DESC
     LIMIT 3`,
    [tenantPhone]
  );
  return result.rows;
}

export async function clearShortlist(tenantPhone: string): Promise<void> {
  await query(`DELETE FROM shortlists WHERE tenant_phone = $1`, [tenantPhone]);
}
