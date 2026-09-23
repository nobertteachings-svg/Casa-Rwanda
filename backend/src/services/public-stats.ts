import { query } from "../db/pool.js";

export interface PublicStats {
  listings: {
    available: number;
    residential: number;
    commercial: number;
    total: number;
  };
  users: {
    tenants: number;
    landlords: number;
    total: number;
    newThisWeek: number;
  };
  updatedAt: string;
}

export async function getPublicStats(): Promise<PublicStats> {
  const [listings, users] = await Promise.all([
    query<{
      available: string;
      residential: string;
      commercial: string;
      total: string;
    }>(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'active')::text AS available,
        COUNT(*) FILTER (WHERE status = 'active' AND property_category = 'residential')::text AS residential,
        COUNT(*) FILTER (WHERE status = 'active' AND property_category = 'commercial')::text AS commercial,
        COUNT(*)::text AS total
      FROM houses
    `),
    query<{
      tenants: string;
      landlords: string;
      total: string;
      new_week: string;
    }>(`
      SELECT
        COUNT(*) FILTER (WHERE role = 'tenant')::text AS tenants,
        COUNT(*) FILTER (WHERE role = 'landlord')::text AS landlords,
        COUNT(*)::text AS total,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')::text AS new_week
      FROM users
      WHERE role != 'admin'
    `),
  ]);

  const l = listings.rows[0];
  const u = users.rows[0];

  return {
    listings: {
      available: parseInt(l?.available ?? "0", 10),
      residential: parseInt(l?.residential ?? "0", 10),
      commercial: parseInt(l?.commercial ?? "0", 10),
      total: parseInt(l?.total ?? "0", 10),
    },
    users: {
      tenants: parseInt(u?.tenants ?? "0", 10),
      landlords: parseInt(u?.landlords ?? "0", 10),
      total: parseInt(u?.total ?? "0", 10),
      newThisWeek: parseInt(u?.new_week ?? "0", 10),
    },
    updatedAt: new Date().toISOString(),
  };
}
