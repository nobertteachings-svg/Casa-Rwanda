import { query } from "../../db/pool.js";
import { env } from "../../config/env.js";
import { findHouseById } from "../houses.js";
import { getLandlordRisk } from "./risk.js";

export async function getUnlockFee(): Promise<number> {
  const row = await query<{ value: string }>(
    `SELECT value::text AS value FROM platform_settings WHERE key = 'unlock_fee_rwf'`
  );
  const raw = row.rows[0]?.value;
  if (!raw) return env.UNLOCK_FEE_RWF;
  return parseInt(raw, 10) || env.UNLOCK_FEE_RWF;
}

export async function setUnlockFee(kes: number, updatedBy: string): Promise<void> {
  await query(
    `INSERT INTO platform_settings (key, value, updated_by, updated_at)
     VALUES ('unlock_fee_rwf', $1::jsonb, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
    [JSON.stringify(kes), updatedBy]
  );
}

export interface ChartSeries {
  signupsByDay: Array<{ date: string; landlords: number; tenants: number }>;
  unlocksByDay: Array<{ date: string; count: number; revenue_kes: number }>;
  listingsByRegion: Array<{ region: string; count: number }>;
  funnel: { searches: number; listingViews: number; unlocks: number };
}

export async function getChartData(): Promise<ChartSeries> {
  const [signups, unlocks, regions, searches, views, unlockTotal] = await Promise.all([
    query<{ date: string; landlords: string; tenants: string }>(
      `SELECT DATE(created_at)::text AS date,
              COUNT(*) FILTER (WHERE role = 'landlord')::text AS landlords,
              COUNT(*) FILTER (WHERE role = 'tenant')::text AS tenants
       FROM users
       WHERE created_at >= CURRENT_DATE - INTERVAL '30 days' AND role != 'admin'
       GROUP BY DATE(created_at)
       ORDER BY date`
    ),
    query<{ date: string; count: string; revenue: string }>(
      `SELECT DATE(paid_at)::text AS date,
              COUNT(*)::text AS count,
              COALESCE(SUM(amount_paid), 0)::text AS revenue
       FROM unlocks
       WHERE paid_at >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY DATE(paid_at)
       ORDER BY date`
    ),
    query<{ region: string; count: string }>(
      `SELECT COALESCE(region, 'unknown') AS region, COUNT(*)::text AS count
       FROM houses WHERE status = 'active'
       GROUP BY region ORDER BY COUNT(*) DESC LIMIT 10`
    ),
    query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM saved_searches`),
    query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM listing_views`),
    query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM unlocks`),
  ]);

  return {
    signupsByDay: signups.rows.map((r) => ({
      date: r.date,
      landlords: parseInt(r.landlords, 10),
      tenants: parseInt(r.tenants, 10),
    })),
    unlocksByDay: unlocks.rows.map((r) => ({
      date: r.date,
      count: parseInt(r.count, 10),
      revenue_kes: parseInt(r.revenue, 10),
    })),
    listingsByRegion: regions.rows.map((r) => ({
      region: r.region,
      count: parseInt(r.count, 10),
    })),
    funnel: {
      searches: parseInt(searches.rows[0]?.count ?? "0", 10),
      listingViews: parseInt(views.rows[0]?.count ?? "0", 10),
      unlocks: parseInt(unlockTotal.rows[0]?.count ?? "0", 10),
    },
  };
}

export interface MarketInsight {
  medianRentByArea: Array<{ area: string; property_subtype: string; median_rent: number; count: number }>;
  topSearchAreas: Array<{ query_text: string; count: number }>;
  supplyDemand: Array<{ area: string; listings: number; searches: number }>;
}

export async function getMarketInsights(): Promise<MarketInsight> {
  const [median, searches, supply] = await Promise.all([
    query<{ area: string; property_subtype: string; median_rent: string; count: string }>(
      `SELECT COALESCE(neighbourhood, city, 'Unknown') AS area,
              COALESCE(property_subtype, type::text) AS property_subtype,
              PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY rent)::int::text AS median_rent,
              COUNT(*)::text AS count
       FROM houses WHERE status = 'active'
       GROUP BY COALESCE(neighbourhood, city, 'Unknown'), COALESCE(property_subtype, type::text)
       HAVING COUNT(*) >= 2
       ORDER BY COUNT(*) DESC LIMIT 15`
    ),
    query<{ query_text: string; count: string }>(
      `SELECT COALESCE(raw_description, query_json->>'neighbourhood', query_json->>'city', 'general') AS query_text,
              COUNT(*)::text AS count
       FROM saved_searches
       GROUP BY query_text ORDER BY COUNT(*) DESC LIMIT 10`
    ),
    query<{ area: string; listings: string }>(
      `SELECT COALESCE(neighbourhood, city, 'Unknown') AS area, COUNT(*)::text AS listings
       FROM houses WHERE status = 'active'
       GROUP BY area ORDER BY COUNT(*) DESC LIMIT 10`
    ),
  ]);

  const searchMap = new Map(searches.rows.map((r) => [r.query_text.toLowerCase(), parseInt(r.count, 10)]));

  return {
    medianRentByArea: median.rows.map((r) => ({
      area: r.area,
      property_subtype: r.property_subtype,
      median_rent: parseInt(r.median_rent, 10),
      count: parseInt(r.count, 10),
    })),
    topSearchAreas: searches.rows.map((r) => ({
      query_text: r.query_text,
      count: parseInt(r.count, 10),
    })),
    supplyDemand: supply.rows.map((r) => ({
      area: r.area,
      listings: parseInt(r.listings, 10),
      searches: searchMap.get(r.area.toLowerCase()) ?? 0,
    })),
  };
}

export interface PaymentRow {
  id: string;
  tenant_phone: string;
  house_id: string;
  amount_paid: number;
  payment_method: string | null;
  paid_at: Date;
  disputed: boolean;
  dispute_reason: string | null;
  refund_flagged: boolean;
  neighbourhood: string | null;
}

export async function listPayments(
  page = 1,
  limit = 30,
  filters?: { tenant?: string; house?: string; disputed?: boolean }
): Promise<{ payments: PaymentRow[]; total: number; byMethod: Record<string, number> }> {
  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters?.tenant) {
    params.push(`%${filters.tenant}%`);
    conditions.push(`u.tenant_phone ILIKE $${params.length}`);
  }
  if (filters?.house) {
    params.push(`%${filters.house}%`);
    conditions.push(`u.house_id ILIKE $${params.length}`);
  }
  if (filters?.disputed) {
    conditions.push(`u.disputed = TRUE`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [countRes, rows, methods] = await Promise.all([
    query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM unlocks u ${where}`, params),
    query<PaymentRow>(
      `SELECT u.id, u.tenant_phone, u.house_id, u.amount_paid, u.payment_method::text,
              u.paid_at, u.disputed, u.dispute_reason, u.refund_flagged,
              h.neighbourhood
       FROM unlocks u
       LEFT JOIN houses h ON h.house_id = u.house_id
       ${where}
       ORDER BY u.paid_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    query<{ method: string; count: string; total: string }>(
      `SELECT COALESCE(payment_method::text, 'unknown') AS method,
              COUNT(*)::text AS count, COALESCE(SUM(amount_paid), 0)::text AS total
       FROM unlocks GROUP BY payment_method`
    ),
  ]);

  const byMethod: Record<string, number> = {};
  for (const m of methods.rows) {
    byMethod[m.method] = parseInt(m.total, 10);
  }

  return {
    payments: rows.rows,
    total: parseInt(countRes.rows[0]?.count ?? "0", 10),
    byMethod,
  };
}

export async function disputeUnlock(
  unlockId: string,
  reason: string,
  flagRefund: boolean
): Promise<boolean> {
  const unlock = await query<{ house_id: string }>(
    `SELECT house_id FROM unlocks WHERE id = $1`,
    [unlockId]
  );
  const row = unlock.rows[0];
  if (!row) return false;

  await query(
    `UPDATE unlocks SET disputed = TRUE, dispute_reason = $2, refund_flagged = $3 WHERE id = $1`,
    [unlockId, reason, flagRefund]
  );
  await query(
    `UPDATE houses SET status = 'flagged', updated_at = NOW()
     WHERE house_id = $1 AND status = 'active'`,
    [row.house_id]
  );
  return true;
}

export interface InboxItem {
  id: string;
  type: "review" | "id_verification" | "house_review" | "duplicate";
  severity: string;
  title: string;
  message: string;
  target_id: string;
  created_at: Date;
  meta?: Record<string, unknown>;
}

export async function getUnifiedInbox(): Promise<InboxItem[]> {
  const [reviews, ids, underReview, duplicates] = await Promise.all([
    query<InboxItem>(
      `SELECT lr.id::text, 'review'::text AS type, lr.severity,
              lr.review_type AS title, lr.message, lr.house_id AS target_id, lr.created_at,
              jsonb_build_object('landlord_phone', h.landlord_phone) AS meta
       FROM listing_reviews lr
       JOIN houses h ON h.house_id = lr.house_id
       WHERE lr.resolved = FALSE`
    ),
    query<InboxItem>(
      `SELECT id::text, 'id_verification'::text AS type, 'warning'::text AS severity,
              COALESCE(document_type, 'id') AS title,
              COALESCE(full_name, landlord_phone) AS message,
              id::text AS target_id, created_at,
              jsonb_build_object('landlord_phone', landlord_phone) AS meta
       FROM landlord_id_verifications
       WHERE status IN ('manual_review', 'pending')`
    ),
    query<InboxItem>(
      `SELECT house_id AS id, 'house_review'::text AS type, 'info'::text AS severity,
              'under_review'::text AS title, neighbourhood AS message,
              house_id AS target_id, created_at,
              jsonb_build_object('landlord_phone', landlord_phone, 'rent', rent) AS meta
       FROM houses WHERE status = 'under_review'`
    ),
    query<InboxItem>(
      `SELECT CONCAT(h1.house_id, ':', h2.house_id) AS id, 'duplicate'::text AS type,
              'warning'::text AS severity, 'duplicate_gps'::text AS title,
              CONCAT(h1.house_id, ' ↔ ', h2.house_id) AS message,
              h1.house_id AS target_id, GREATEST(h1.created_at, h2.created_at) AS created_at,
              jsonb_build_object('house_b', h2.house_id) AS meta
       FROM houses h1
       JOIN houses h2 ON h1.latitude = h2.latitude AND h1.longitude = h2.longitude
         AND h1.house_id < h2.house_id
       WHERE h1.status != 'inactive' AND h2.status != 'inactive'
       LIMIT 10`
    ),
  ]);

  const items = [...reviews.rows, ...ids.rows, ...underReview.rows, ...duplicates.rows];
  const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  items.sort((a, b) => {
    const sd = (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3);
    if (sd !== 0) return sd;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  return items;
}

export interface UserDetail {
  phone: string;
  role: string;
  language: string;
  display_name: string | null;
  verified: boolean;
  verification_method: string | null;
  suspended: boolean;
  suspended_reason: string | null;
  created_at: Date;
  listings: Array<{ house_id: string; rent: number; status: string; neighbourhood: string | null }>;
  unlocks: Array<{ house_id: string; amount_paid: number; paid_at: Date }>;
  risk: Awaited<ReturnType<typeof getLandlordRisk>> | null;
}

export async function getUserDetail(phone: string): Promise<UserDetail | null> {
  const user = await query<{
    phone: string;
    role: string;
    language: string;
    display_name: string | null;
    verified: boolean;
    verification_method: string | null;
    suspended: boolean;
    suspended_reason: string | null;
    created_at: Date;
  }>(
    `SELECT phone, role::text, language::text,
            COALESCE(NULLIF(TRIM(display_name), ''), NULLIF(TRIM(id_full_name), '')) AS display_name,
            verified, verification_method,
            COALESCE(suspended, FALSE) AS suspended, suspended_reason, created_at
     FROM users WHERE phone = $1`,
    [phone]
  );
  const row = user.rows[0];
  if (!row) return null;

  const [listings, unlocks] = await Promise.all([
    query<{ house_id: string; rent: number; status: string; neighbourhood: string | null }>(
      `SELECT house_id, rent, status::text, neighbourhood FROM houses WHERE landlord_phone = $1 ORDER BY created_at DESC LIMIT 20`,
      [phone]
    ),
    query<{ house_id: string; amount_paid: number; paid_at: Date }>(
      `SELECT house_id, amount_paid, paid_at FROM unlocks WHERE tenant_phone = $1 ORDER BY paid_at DESC LIMIT 20`,
      [phone]
    ),
  ]);

  const risk = row.role === "landlord" ? await getLandlordRisk(phone) : null;

  return { ...row, listings: listings.rows, unlocks: unlocks.rows, risk };
}

export async function setUserSuspended(
  phone: string,
  suspended: boolean,
  reason?: string
): Promise<boolean> {
  const result = await query(
    `UPDATE users SET suspended = $2, suspended_at = CASE WHEN $2 THEN NOW() ELSE NULL END,
      suspended_reason = $3, updated_at = NOW()
     WHERE phone = $1`,
    [phone, suspended, reason ?? null]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getHouseDetail(houseId: string) {
  const house = await findHouseById(houseId);
  if (!house) return null;
  const risk = await getLandlordRisk(house.landlord_phone);
  const reviews = await query(
    `SELECT id, review_type, severity, message, resolved, created_at
     FROM listing_reviews WHERE house_id = $1 ORDER BY created_at DESC LIMIT 10`,
    [houseId]
  );
  return { house, risk, reviews: reviews.rows };
}

export async function globalSearch(q: string): Promise<{
  users: Array<{ phone: string; role: string; display_name: string | null }>;
  houses: Array<{ house_id: string; neighbourhood: string | null; rent: number; status: string }>;
}> {
  const term = `%${q}%`;
  const [users, houses] = await Promise.all([
    query<{ phone: string; role: string; display_name: string | null }>(
      `SELECT phone, role::text,
              COALESCE(NULLIF(TRIM(display_name), ''), NULLIF(TRIM(id_full_name), '')) AS display_name
       FROM users
       WHERE phone ILIKE $1 OR display_name ILIKE $1 OR id_full_name ILIKE $1
       LIMIT 10`,
      [term]
    ),
    query<{ house_id: string; neighbourhood: string | null; rent: number; status: string }>(
      `SELECT house_id, neighbourhood, rent, status::text FROM houses
       WHERE house_id ILIKE $1 OR neighbourhood ILIKE $1 OR city ILIKE $1 OR landlord_phone ILIKE $1
       LIMIT 10`,
      [term]
    ),
  ]);
  return { users: users.rows, houses: houses.rows };
}

export async function getNavBadges(): Promise<{
  moderation: number;
  verifications: number;
  payments_disputed: number;
}> {
  const [mod, ver, disp] = await Promise.all([
    query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM listing_reviews WHERE resolved = FALSE`),
    query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM landlord_id_verifications WHERE status IN ('manual_review', 'pending')`
    ),
    query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM unlocks WHERE disputed = TRUE AND dispute_resolved_at IS NULL`),
  ]);
  return {
    moderation: parseInt(mod.rows[0]?.c ?? "0", 10),
    verifications: parseInt(ver.rows[0]?.c ?? "0", 10),
    payments_disputed: parseInt(disp.rows[0]?.c ?? "0", 10),
  };
}

export async function exportCsv(type: "users" | "houses" | "unlocks"): Promise<string> {
  if (type === "users") {
    const rows = await query(
      `SELECT phone, role, language, display_name, verified, created_at FROM users WHERE role != 'admin' ORDER BY created_at DESC LIMIT 5000`
    );
    return toCsv(["phone", "role", "language", "display_name", "verified", "created_at"], rows.rows);
  }
  if (type === "houses") {
    const rows = await query(
      `SELECT house_id, landlord_phone, rent, neighbourhood, city, region, status, created_at
       FROM houses ORDER BY created_at DESC LIMIT 5000`
    );
    return toCsv(
      ["house_id", "landlord_phone", "rent", "neighbourhood", "city", "region", "status", "created_at"],
      rows.rows
    );
  }
  const rows = await query(
    `SELECT id, tenant_phone, house_id, amount_paid, payment_method, paid_at, disputed
     FROM unlocks ORDER BY paid_at DESC LIMIT 5000`
  );
  return toCsv(
    ["id", "tenant_phone", "house_id", "amount_paid", "payment_method", "paid_at", "disputed"],
    rows.rows
  );
}

function toCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\n");
}

export async function listFailedPayments(): Promise<
  Array<{ id: string; tenant_phone: string; house_id: string; amount: number; status: string; created_at: Date }>
> {
  const result = await query(
    `SELECT id, tenant_phone, house_id, amount, status, created_at
     FROM payments WHERE status != 'completed'
     ORDER BY created_at DESC LIMIT 50`
  );
  return result.rows as Array<{
    id: string;
    tenant_phone: string;
    house_id: string;
    amount: number;
    status: string;
    created_at: Date;
  }>;
}
