import { query } from "../../db/pool.js";
import { env, isPaymentsEnabled } from "../../config/env.js";

export interface UnlockRecord {
  id: string;
  tenant_phone: string;
  house_id: string;
  amount_paid: number;
  paid_at: Date;
  beneficiary_phone: string | null;
  landlord_phone?: string;
  rent?: number;
  neighbourhood?: string | null;
}

export async function recordUnlock(params: {
  tenantPhone: string;
  houseId: string;
  amountPaid?: number;
  beneficiaryPhone?: string;
  payerPhone?: string;
  useCredit?: boolean;
}): Promise<UnlockRecord> {
  const existing = await query<UnlockRecord>(
    `SELECT id, tenant_phone, house_id, amount_paid, paid_at, beneficiary_phone
     FROM unlocks WHERE tenant_phone = $1 AND house_id = $2`,
    [params.tenantPhone, params.houseId]
  );
  if (existing.rows[0]) return existing.rows[0];

  let amount = params.amountPaid ?? (isPaymentsEnabled ? env.UNLOCK_FEE_RWF : 0);
  if (params.useCredit && isPaymentsEnabled) {
    const credit = await query(
      `UPDATE credits SET used = TRUE
       WHERE id = (
         SELECT id FROM credits
         WHERE user_phone = $1 AND used = FALSE AND credit_type = 'free_unlock'
         AND (expires_at IS NULL OR expires_at > NOW())
         LIMIT 1
       ) RETURNING id`,
      [params.tenantPhone]
    );
    if ((credit.rowCount ?? 0) > 0) amount = 0;
  }

  const result = await query<UnlockRecord>(
    `INSERT INTO unlocks (
      tenant_phone, house_id, amount_paid, beneficiary_phone, payer_phone, paid_at
    ) VALUES ($1,$2,$3,$4,$5,NOW())
    RETURNING id, tenant_phone, house_id, amount_paid, paid_at, beneficiary_phone`,
    [
      params.tenantPhone,
      params.houseId,
      amount,
      params.beneficiaryPhone ?? null,
      params.payerPhone ?? params.tenantPhone,
    ]
  );
  return result.rows[0];
}

export async function getUnlockHistory(tenantPhone: string): Promise<UnlockRecord[]> {
  const result = await query<UnlockRecord>(
    `SELECT u.id, u.tenant_phone, u.house_id, u.amount_paid, u.paid_at, u.beneficiary_phone,
            h.landlord_phone, h.rent, h.neighbourhood
     FROM unlocks u
     JOIN houses h ON h.house_id = u.house_id
     WHERE u.tenant_phone = $1 OR u.beneficiary_phone = $1
     ORDER BY u.paid_at DESC`,
    [tenantPhone]
  );
  return result.rows;
}

export async function getUnlocksForLandlord(landlordPhone: string): Promise<UnlockRecord[]> {
  const result = await query<UnlockRecord>(
    `SELECT u.id, u.tenant_phone, u.house_id, u.amount_paid, u.paid_at, u.beneficiary_phone,
            h.landlord_phone, h.rent, h.neighbourhood
     FROM unlocks u
     JOIN houses h ON h.house_id = u.house_id
     WHERE h.landlord_phone = $1
     ORDER BY u.paid_at DESC
     LIMIT 50`,
    [landlordPhone]
  );
  return result.rows;
}

export async function hasUnlocked(
  tenantPhone: string,
  houseId: string
): Promise<boolean> {
  const result = await query(
    `SELECT 1 FROM unlocks WHERE tenant_phone = $1 AND house_id = $2`,
    [tenantPhone, houseId]
  );
  return (result.rowCount ?? 0) > 0;
}
