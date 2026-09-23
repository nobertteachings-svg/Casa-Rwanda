import { query } from "../db/pool.js";
import { env } from "../config/env.js";

export interface DashboardStats {
  users: {
    total: number;
    landlords: number;
    tenants: number;
    newToday: number;
    newThisWeek: number;
  };
  listings: {
    total: number;
    active: number;
    flagged: number;
    underReview: number;
    inactive: number;
    newToday: number;
  };
  revenue: {
    totalUnlocks: number;
    totalEarningsUgx: number;
    unlocksToday: number;
    earningsTodayUgx: number;
    unlocksThisMonth: number;
    earningsThisMonthUgx: number;
    unlockFeeRwf: number;
  };
  moderation: {
    pendingReviews: number;
  };
  topNeighbourhoods: Array<{ neighbourhood: string; count: number }>;
  recentUnlocks: Array<{
    id: string;
    tenant_phone: string;
    house_id: string;
    amount_paid: number;
    payment_method: string | null;
    paid_at: Date;
  }>;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [
    users,
    listings,
    revenue,
    moderation,
    topNeighbourhoods,
    recentUnlocks,
  ] = await Promise.all([
    query<{
      total: string;
      landlords: string;
      tenants: string;
      new_today: string;
      new_week: string;
    }>(`
      SELECT
        COUNT(*)::text AS total,
        COUNT(*) FILTER (WHERE role = 'landlord')::text AS landlords,
        COUNT(*) FILTER (WHERE role = 'tenant')::text AS tenants,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::text AS new_today,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')::text AS new_week
      FROM users
      WHERE role != 'admin'
    `),
    query<{
      total: string;
      active: string;
      flagged: string;
      under_review: string;
      inactive: string;
      new_today: string;
    }>(`
      SELECT
        COUNT(*)::text AS total,
        COUNT(*) FILTER (WHERE status = 'active')::text AS active,
        COUNT(*) FILTER (WHERE status = 'flagged')::text AS flagged,
        COUNT(*) FILTER (WHERE status = 'under_review')::text AS under_review,
        COUNT(*) FILTER (WHERE status = 'inactive')::text AS inactive,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::text AS new_today
      FROM houses
    `),
    query<{
      total_unlocks: string;
      total_earnings: string;
      unlocks_today: string;
      earnings_today: string;
      unlocks_month: string;
      earnings_month: string;
    }>(`
      SELECT
        COUNT(*)::text AS total_unlocks,
        COALESCE(SUM(amount_paid), 0)::text AS total_earnings,
        COUNT(*) FILTER (WHERE paid_at >= CURRENT_DATE)::text AS unlocks_today,
        COALESCE(SUM(amount_paid) FILTER (WHERE paid_at >= CURRENT_DATE), 0)::text AS earnings_today,
        COUNT(*) FILTER (WHERE paid_at >= DATE_TRUNC('month', CURRENT_DATE))::text AS unlocks_month,
        COALESCE(SUM(amount_paid) FILTER (WHERE paid_at >= DATE_TRUNC('month', CURRENT_DATE)), 0)::text AS earnings_month
      FROM unlocks
    `),
    query<{ pending: string }>(`
      SELECT COUNT(*)::text AS pending
      FROM listing_reviews
      WHERE resolved = FALSE
    `),
    query<{ neighbourhood: string; count: string }>(`
      SELECT COALESCE(neighbourhood, city, 'Unknown') AS neighbourhood, COUNT(*)::text AS count
      FROM houses
      WHERE status = 'active'
      GROUP BY COALESCE(neighbourhood, city, 'Unknown')
      ORDER BY COUNT(*) DESC
      LIMIT 8
    `),
    query<{
      id: string;
      tenant_phone: string;
      house_id: string;
      amount_paid: number;
      payment_method: string | null;
      paid_at: Date;
    }>(`
      SELECT id, tenant_phone, house_id, amount_paid, payment_method::text, paid_at
      FROM unlocks
      ORDER BY paid_at DESC
      LIMIT 10
    `),
  ]);

  const u = users.rows[0];
  const l = listings.rows[0];
  const r = revenue.rows[0];

  return {
    users: {
      total: parseInt(u.total, 10),
      landlords: parseInt(u.landlords, 10),
      tenants: parseInt(u.tenants, 10),
      newToday: parseInt(u.new_today, 10),
      newThisWeek: parseInt(u.new_week, 10),
    },
    listings: {
      total: parseInt(l.total, 10),
      active: parseInt(l.active, 10),
      flagged: parseInt(l.flagged, 10),
      underReview: parseInt(l.under_review, 10),
      inactive: parseInt(l.inactive, 10),
      newToday: parseInt(l.new_today, 10),
    },
    revenue: {
      totalUnlocks: parseInt(r.total_unlocks, 10),
      totalEarningsUgx: parseInt(r.total_earnings, 10),
      unlocksToday: parseInt(r.unlocks_today, 10),
      earningsTodayUgx: parseInt(r.earnings_today, 10),
      unlocksThisMonth: parseInt(r.unlocks_month, 10),
      earningsThisMonthUgx: parseInt(r.earnings_month, 10),
      unlockFeeRwf: env.UNLOCK_FEE_RWF,
    },
    moderation: {
      pendingReviews: parseInt(moderation.rows[0].pending, 10),
    },
    topNeighbourhoods: topNeighbourhoods.rows.map((row) => ({
      neighbourhood: row.neighbourhood,
      count: parseInt(row.count, 10),
    })),
    recentUnlocks: recentUnlocks.rows,
  };
}

export interface UserRow {
  phone: string;
  role: string;
  language: string;
  display_name: string | null;
  created_at: Date;
  listing_count: number;
  unlock_count: number;
  verified?: boolean;
  suspended?: boolean;
}

const USER_DISPLAY_NAME = `COALESCE(NULLIF(TRIM(u.display_name), ''), NULLIF(TRIM(u.id_full_name), ''))`;

export async function listUsers(
  page = 1,
  limit = 20,
  filters?: { role?: string; verified?: string; suspended?: string }
): Promise<{ users: UserRow[]; total: number }> {
  const offset = (page - 1) * limit;
  const conditions = ["u.role != 'admin'"];
  const params: unknown[] = [];

  if (filters?.role && filters.role !== "all") {
    params.push(filters.role);
    conditions.push(`u.role = $${params.length}`);
  }
  if (filters?.verified === "true") conditions.push("u.verified = TRUE");
  if (filters?.verified === "false") conditions.push("u.verified = FALSE");
  if (filters?.suspended === "true") conditions.push("COALESCE(u.suspended, FALSE) = TRUE");
  if (filters?.suspended === "false") conditions.push("COALESCE(u.suspended, FALSE) = FALSE");

  const where = `WHERE ${conditions.join(" AND ")}`;
  params.push(limit, offset);

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM users u ${where}`,
    params.slice(0, -2)
  );

  const result = await query<UserRow & { verified: boolean; suspended: boolean }>(
    `SELECT
      u.phone, u.role::text, u.language::text,
      ${USER_DISPLAY_NAME} AS display_name,
      u.created_at,
      u.verified, COALESCE(u.suspended, FALSE) AS suspended,
      (SELECT COUNT(*)::int FROM houses h WHERE h.landlord_phone = u.phone) AS listing_count,
      (SELECT COUNT(*)::int FROM unlocks un WHERE un.tenant_phone = u.phone) AS unlock_count
    FROM users u
    ${where}
    ORDER BY u.created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    users: result.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

export interface HouseRow {
  house_id: string;
  landlord_phone: string;
  type: string;
  rent: number;
  neighbourhood: string | null;
  city: string | null;
  region?: string | null;
  property_category?: string | null;
  property_subtype?: string | null;
  status: string;
  created_at: Date;
  review_count: number;
}

export async function listHouses(
  page = 1,
  limit = 20,
  filters?: {
    status?: string;
    city?: string;
    region?: string;
    rentMin?: number;
    rentMax?: number;
    category?: string;
  }
): Promise<{ houses: HouseRow[]; total: number }> {
  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters?.status && filters.status !== "all") {
    params.push(filters.status);
    conditions.push(`h.status = $${params.length}`);
  }
  if (filters?.city) {
    params.push(`%${filters.city}%`);
    conditions.push(`h.city ILIKE $${params.length}`);
  }
  if (filters?.region) {
    params.push(filters.region);
    conditions.push(`h.region = $${params.length}`);
  }
  if (filters?.rentMin) {
    params.push(filters.rentMin);
    conditions.push(`h.rent >= $${params.length}`);
  }
  if (filters?.rentMax) {
    params.push(filters.rentMax);
    conditions.push(`h.rent <= $${params.length}`);
  }
  if (filters?.category) {
    params.push(filters.category);
    conditions.push(`h.property_category = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  params.push(limit, offset);

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM houses h ${where}`,
    params.slice(0, -2)
  );

  const result = await query<HouseRow>(
    `SELECT
      h.house_id, h.landlord_phone, h.type::text, h.rent,
      h.neighbourhood, h.city, h.region, h.property_category, h.property_subtype,
      h.status::text, h.created_at,
      (SELECT COUNT(*)::int FROM listing_reviews lr WHERE lr.house_id = h.house_id AND lr.resolved = FALSE) AS review_count
    FROM houses h
    ${where}
    ORDER BY h.created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    houses: result.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

export interface ReviewRow {
  id: string;
  house_id: string;
  review_type: string;
  severity: string;
  message: string;
  resolved: boolean;
  created_at: Date;
  neighbourhood: string | null;
  landlord_phone: string;
  house_status: string;
}

export async function listReviews(
  resolved = false
): Promise<ReviewRow[]> {
  const result = await query<ReviewRow>(
    `SELECT
      lr.id, lr.house_id, lr.review_type, lr.severity, lr.message,
      lr.resolved, lr.created_at,
      h.neighbourhood, h.landlord_phone, h.status::text AS house_status
    FROM listing_reviews lr
    JOIN houses h ON h.house_id = lr.house_id
    WHERE lr.resolved = $1
    ORDER BY
      CASE lr.severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
      lr.created_at DESC`,
    [resolved]
  );
  return result.rows;
}

export async function updateHouseStatus(
  houseId: string,
  status: "active" | "inactive" | "flagged" | "under_review"
): Promise<boolean> {
  const result = await query(
    "UPDATE houses SET status = $2, updated_at = NOW() WHERE house_id = $1",
    [houseId, status]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function resolveReview(reviewId: string): Promise<boolean> {
  const result = await query(
    "UPDATE listing_reviews SET resolved = TRUE WHERE id = $1",
    [reviewId]
  );
  return (result.rowCount ?? 0) > 0;
}
