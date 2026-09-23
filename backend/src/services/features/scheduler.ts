import { withLeaderLock } from "../leader-lock.js";
import { query } from "../../db/pool.js";
import { getListingStats, getLandlordWeeklyDigest } from "./views.js";
import { getStaleListings } from "./market-intel.js";
import { suggestPriceAdjustment } from "../claude.js";
import { getMarketTrendReport } from "./market-intel.js";
import { sendTextMessage } from "../whatsapp.js";
import { findHouseById } from "../houses.js";

const DIGEST_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const PRICE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const LOCK_TTL_SEC = 3600;

export function startScheduledJobs(): void {
  console.log("📅 Casa scheduled jobs registered (leader-elected via Redis)");

  setInterval(
    () => void withLeaderLock("weekly-digest", LOCK_TTL_SEC, sendWeeklyPerformancePings),
    DIGEST_INTERVAL_MS
  );
  setInterval(
    () => void withLeaderLock("price-suggestions", LOCK_TTL_SEC, sendDynamicPriceSuggestions),
    PRICE_CHECK_INTERVAL_MS
  );

  setTimeout(
    () => void withLeaderLock("market-trends", LOCK_TTL_SEC, sendMonthlyMarketTrends),
    60_000
  );
  setInterval(
    () => void withLeaderLock("market-trends", LOCK_TTL_SEC, sendMonthlyMarketTrends),
    DIGEST_INTERVAL_MS
  );
}

async function sendWeeklyPerformancePings(): Promise<void> {
  const landlords = await query<{ phone: string; language: string }>(
    `SELECT phone, language::text FROM users WHERE role = 'landlord'`
  );

  for (const landlord of landlords.rows) {
    const stats = await getLandlordWeeklyDigest(landlord.phone);
    const active = stats.filter((s) => s.views > 0 || s.unlocks > 0);
    if (active.length === 0) continue;

    const lang = landlord.language === "fr" ? "fr" : "en";
    const header =
      lang === "fr" ? "📊 *Performance de vos annonces cette semaine:*\n" : "📊 *Your listing performance this week:*\n";
    const lines = active
      .map((s) =>
        lang === "fr"
          ? `• *${s.house_id}*: ${s.views} vues, ${s.unlocks} déblocages`
          : `• *${s.house_id}*: ${s.views} views, ${s.unlocks} unlocks`
      )
      .join("\n");

    await sendTextMessage(landlord.phone, header + lines);
  }
}

async function sendDynamicPriceSuggestions(): Promise<void> {
  const stale = await getStaleListings(14);

  for (const listing of stale) {
    const avgResult = await query<{ avg: string }>(
      `SELECT ROUND(AVG(rent))::text AS avg FROM houses
       WHERE status = 'active' AND neighbourhood = $1 AND house_id != $2`,
      [listing.neighbourhood, listing.house_id]
    );
    const areaAvg = parseInt(avgResult.rows[0]?.avg ?? String(listing.rent), 10);
    const house = await findHouseById(listing.house_id);
    if (!house) continue;

    const suggestion = await suggestPriceAdjustment(
      { house_id: listing.house_id, rent: listing.rent, neighbourhood: listing.neighbourhood, type: house.type },
      areaAvg,
      "en"
    );
    if (!suggestion) continue;

    await sendTextMessage(
      listing.landlord_phone,
      `💡 *Price suggestion for ${listing.house_id}:*\n\n${suggestion}`
    );
  }
}

async function sendMonthlyMarketTrends(): Promise<void> {
  const report = await getMarketTrendReport();
  const landlords = await query<{ phone: string }>(
    `SELECT phone FROM users WHERE role = 'landlord'`
  );

  for (const landlord of landlords.rows) {
    await sendTextMessage(landlord.phone, report);
  }
}
