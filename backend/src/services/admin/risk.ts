import { query } from "../../db/pool.js";

export type RiskLevel = "low" | "medium" | "high";

export interface LandlordRisk {
  phone: string;
  level: RiskLevel;
  flaggedListings: number;
  totalListings: number;
  unresolvedReviews: number;
  duplicateGpsCount: number;
  duplicateRentAreaCount: number;
  unlockCount: number;
  reasons: string[];
}

function scoreRisk(signals: {
  flaggedListings: number;
  unresolvedReviews: number;
  duplicateGps: number;
  duplicateRentArea: number;
}): { level: RiskLevel; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  if (signals.flaggedListings > 0) {
    score += signals.flaggedListings * 2;
    reasons.push(`${signals.flaggedListings} flagged listing(s)`);
  }
  if (signals.unresolvedReviews > 0) {
    score += signals.unresolvedReviews * 2;
    reasons.push(`${signals.unresolvedReviews} open review(s)`);
  }
  if (signals.duplicateGps > 0) {
    score += 3;
    reasons.push("Duplicate GPS pin on multiple listings");
  }
  if (signals.duplicateRentArea > 0) {
    score += 2;
    reasons.push("Same rent + area as another listing");
  }

  const level: RiskLevel = score >= 5 ? "high" : score >= 2 ? "medium" : "low";
  return { level, reasons };
}

export async function getLandlordRisk(phone: string): Promise<LandlordRisk> {
  const [listings, reviews, gpsDup, rentDup, unlocks] = await Promise.all([
    query<{ flagged: string; total: string }>(
      `SELECT
        COUNT(*) FILTER (WHERE status IN ('flagged', 'under_review'))::text AS flagged,
        COUNT(*)::text AS total
       FROM houses WHERE landlord_phone = $1`,
      [phone]
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM listing_reviews lr
       JOIN houses h ON h.house_id = lr.house_id
       WHERE h.landlord_phone = $1 AND lr.resolved = FALSE`,
      [phone]
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM houses h1
       JOIN houses h2 ON h1.latitude = h2.latitude AND h1.longitude = h2.longitude
         AND h1.house_id != h2.house_id
       WHERE h1.landlord_phone = $1`,
      [phone]
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM houses h1
       JOIN houses h2 ON h1.rent = h2.rent
         AND COALESCE(h1.neighbourhood, '') = COALESCE(h2.neighbourhood, '')
         AND h1.house_id != h2.house_id
       WHERE h1.landlord_phone = $1`,
      [phone]
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM unlocks u
       JOIN houses h ON h.house_id = u.house_id
       WHERE h.landlord_phone = $1`,
      [phone]
    ),
  ]);

  const flaggedListings = parseInt(listings.rows[0]?.flagged ?? "0", 10);
  const totalListings = parseInt(listings.rows[0]?.total ?? "0", 10);
  const unresolvedReviews = parseInt(reviews.rows[0]?.count ?? "0", 10);
  const duplicateGpsCount = parseInt(gpsDup.rows[0]?.count ?? "0", 10);
  const duplicateRentAreaCount = parseInt(rentDup.rows[0]?.count ?? "0", 10);
  const unlockCount = parseInt(unlocks.rows[0]?.count ?? "0", 10);

  const { level, reasons } = scoreRisk({
    flaggedListings,
    unresolvedReviews,
    duplicateGps: duplicateGpsCount,
    duplicateRentArea: duplicateRentAreaCount,
  });

  return {
    phone,
    level,
    flaggedListings,
    totalListings,
    unresolvedReviews,
    duplicateGpsCount,
    duplicateRentAreaCount,
    unlockCount,
    reasons,
  };
}

export interface DuplicateListing {
  house_id_a: string;
  house_id_b: string;
  landlord_a: string;
  landlord_b: string;
  match_type: "gps" | "rent_area" | "photo";
  detail: string;
}

export async function findDuplicateListings(limit = 50): Promise<DuplicateListing[]> {
  const [gps, rent] = await Promise.all([
    query<DuplicateListing>(
      `SELECT h1.house_id AS house_id_a, h2.house_id AS house_id_b,
              h1.landlord_phone AS landlord_a, h2.landlord_phone AS landlord_b,
              'gps'::text AS match_type,
              CONCAT(h1.latitude, ',', h1.longitude) AS detail
       FROM houses h1
       JOIN houses h2 ON h1.latitude = h2.latitude AND h1.longitude = h2.longitude
         AND h1.house_id < h2.house_id
       WHERE h1.status != 'inactive' AND h2.status != 'inactive'
       LIMIT $1`,
      [limit]
    ),
    query<DuplicateListing>(
      `SELECT h1.house_id AS house_id_a, h2.house_id AS house_id_b,
              h1.landlord_phone AS landlord_a, h2.landlord_phone AS landlord_b,
              'rent_area'::text AS match_type,
              CONCAT(h1.rent, ' RWF — ', COALESCE(h1.neighbourhood, h1.city, '?')) AS detail
       FROM houses h1
       JOIN houses h2 ON h1.rent = h2.rent
         AND COALESCE(h1.neighbourhood, '') = COALESCE(h2.neighbourhood, '')
         AND h1.house_id < h2.house_id
       WHERE h1.status != 'inactive' AND h2.status != 'inactive'
       LIMIT $1`,
      [limit]
    ),
  ]);

  return [...gps.rows, ...rent.rows];
}
