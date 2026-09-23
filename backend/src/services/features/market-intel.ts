import { query } from "../../db/pool.js";

export async function getRentHeatMapText(area?: string): Promise<string> {
  const result = await query<{
    neighbourhood: string;
    avg_rent: string;
    count: string;
    min_rent: string;
    max_rent: string;
  }>(
    `SELECT
      COALESCE(neighbourhood, city, 'Unknown') AS neighbourhood,
      ROUND(AVG(rent))::text AS avg_rent,
      COUNT(*)::text AS count,
      MIN(rent)::text AS min_rent,
      MAX(rent)::text AS max_rent
    FROM houses
    WHERE status = 'active'
    ${area ? `AND (LOWER(neighbourhood) LIKE $1 OR LOWER(city) LIKE $1)` : ""}
    GROUP BY COALESCE(neighbourhood, city, 'Unknown')
    ORDER BY COUNT(*) DESC
    LIMIT 10`,
    area ? [`%${area.toLowerCase()}%`] : []
  );

  if (result.rows.length === 0) {
    return "📊 No rent data available yet for this area. More listings needed.";
  }

  const lines = result.rows.map((r) => {
    const bar = "█".repeat(Math.min(10, parseInt(r.count, 10)));
    return `${r.neighbourhood}: ~RWF ${parseInt(r.avg_rent, 10).toLocaleString()} avg (${r.min_rent}-${r.max_rent}) ${bar}`;
  });

  return `📊 *Rent Heat Map* (anonymized)\n\n${lines.join("\n")}\n\n_Based on ${result.rows.reduce((s, r) => s + parseInt(r.count, 10), 0)} active listings_`;
}

export async function getMarketTrendReport(lang: "en" | "fr" = "en"): Promise<string> {
  const result = await query<{
    neighbourhood: string;
    current_avg: string;
    prev_avg: string;
  }>(
    `WITH current_month AS (
      SELECT COALESCE(neighbourhood, city, 'Unknown') AS area,
             AVG(rent) AS avg_rent
      FROM houses
      WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE) AND status = 'active'
      GROUP BY COALESCE(neighbourhood, city, 'Unknown')
    ),
    prev_month AS (
      SELECT COALESCE(neighbourhood, city, 'Unknown') AS area,
             AVG(rent) AS avg_rent
      FROM houses
      WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
        AND created_at < DATE_TRUNC('month', CURRENT_DATE) AND status = 'active'
      GROUP BY COALESCE(neighbourhood, city, 'Unknown')
    )
    SELECT c.area AS neighbourhood,
           ROUND(c.avg_rent)::text AS current_avg,
           ROUND(COALESCE(p.avg_rent, c.avg_rent))::text AS prev_avg
    FROM current_month c
    LEFT JOIN prev_month p ON p.area = c.area
    ORDER BY c.avg_rent DESC
    LIMIT 8`
  );

  if (result.rows.length === 0) {
    return lang === "fr"
      ? "📈 Tendances du marché : pas assez de données. Revenez le mois prochain !"
      : "📈 Market trend report: not enough data yet. Check back next month!";
  }

  const lines = result.rows.map((r) => {
    const curr = parseInt(r.current_avg, 10);
    const prev = parseInt(r.prev_avg, 10);
    const pct = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 0;
    const arrow = pct > 0 ? "↑" : pct < 0 ? "↓" : "→";
    return `• ${r.neighbourhood}: RWF ${curr.toLocaleString()} ${arrow} ${pct > 0 ? "+" : ""}${pct}%`;
  });

  const header =
    lang === "fr" ? "📈 *Tendances loyers du mois*" : "📈 *Monthly Rent Trends*";
  return `${header}\n\n${lines.join("\n")}`;
}

export async function getStaleListings(days = 14): Promise<
  Array<{ house_id: string; landlord_phone: string; rent: number; neighbourhood: string | null }>
> {
  const result = await query<{
    house_id: string;
    landlord_phone: string;
    rent: number;
    neighbourhood: string | null;
  }>(
    `SELECT h.house_id, h.landlord_phone, h.rent, h.neighbourhood
     FROM houses h
     WHERE h.status = 'active'
       AND h.created_at < NOW() - ($1 || ' days')::interval
       AND NOT EXISTS (
         SELECT 1 FROM unlocks u
         WHERE u.house_id = h.house_id
         AND u.paid_at >= NOW() - ($1 || ' days')::interval
       )`,
    [String(days)]
  );
  return result.rows;
}

export async function getRentHeatMapJson(area?: string): Promise<
  Array<{
    neighbourhood: string;
    avgRent: number;
    count: number;
    minRent: number;
    maxRent: number;
  }>
> {
  const result = await query<{
    neighbourhood: string;
    avg_rent: string;
    count: string;
    min_rent: string;
    max_rent: string;
  }>(
    `SELECT
      COALESCE(neighbourhood, city, 'Unknown') AS neighbourhood,
      ROUND(AVG(rent))::text AS avg_rent,
      COUNT(*)::text AS count,
      MIN(rent)::text AS min_rent,
      MAX(rent)::text AS max_rent
    FROM houses
    WHERE status = 'active'
    ${area ? `AND (LOWER(neighbourhood) LIKE $1 OR LOWER(city) LIKE $1)` : ""}
    GROUP BY COALESCE(neighbourhood, city, 'Unknown')
    ORDER BY COUNT(*) DESC
    LIMIT 20`,
    area ? [`%${area.toLowerCase()}%`] : []
  );
  return result.rows.map((r) => ({
    neighbourhood: r.neighbourhood,
    avgRent: parseInt(r.avg_rent, 10),
    count: parseInt(r.count, 10),
    minRent: parseInt(r.min_rent, 10),
    maxRent: parseInt(r.max_rent, 10),
  }));
}

export async function getMarketTrendsJson(): Promise<
  Array<{ neighbourhood: string; currentAvg: number; prevAvg: number; changePct: number }>
> {
  const result = await query<{
    neighbourhood: string;
    current_avg: string;
    prev_avg: string;
  }>(
    `WITH current_month AS (
      SELECT COALESCE(neighbourhood, city, 'Unknown') AS area, AVG(rent) AS avg_rent
      FROM houses
      WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE) AND status = 'active'
      GROUP BY COALESCE(neighbourhood, city, 'Unknown')
    ),
    prev_month AS (
      SELECT COALESCE(neighbourhood, city, 'Unknown') AS area, AVG(rent) AS avg_rent
      FROM houses
      WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
        AND created_at < DATE_TRUNC('month', CURRENT_DATE) AND status = 'active'
      GROUP BY COALESCE(neighbourhood, city, 'Unknown')
    )
    SELECT c.area AS neighbourhood,
           ROUND(c.avg_rent)::text AS current_avg,
           ROUND(COALESCE(p.avg_rent, c.avg_rent))::text AS prev_avg
    FROM current_month c
    LEFT JOIN prev_month p ON p.area = c.area
    ORDER BY c.avg_rent DESC
    LIMIT 12`
  );
  return result.rows.map((r) => {
    const currentAvg = parseInt(r.current_avg, 10);
    const prevAvg = parseInt(r.prev_avg, 10);
    const changePct = prevAvg > 0 ? Math.round(((currentAvg - prevAvg) / prevAvg) * 100) : 0;
    return { neighbourhood: r.neighbourhood, currentAvg, prevAvg, changePct };
  });
}
