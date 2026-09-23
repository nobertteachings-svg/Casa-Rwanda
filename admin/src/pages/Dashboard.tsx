import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import StatCard from "../components/StatCard";
import ErrorBanner from "../components/ErrorBanner";
import { BarChart } from "../components/BarChart";
import type { DashboardStats } from "../types";
import { formatDate, formatRwf } from "../utils";

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    setError("");
    api
      .getStats()
      .then(setStats)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <p className="page-loading">Loading dashboard…</p>;
  if (error) {
    return (
      <div className="page">
        <ErrorBanner message={error} onRetry={load} />
      </div>
    );
  }
  if (!stats) return null;

  const ops = stats.ops;
  const charts = stats.charts;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Platform overview and earnings</p>
        </div>
        <div className="header-pills">
          {stats.badges && stats.badges.moderation > 0 && (
            <Link to="/moderation" className="alert-pill">{stats.badges.moderation} moderation</Link>
          )}
          {stats.badges && stats.badges.verifications > 0 && (
            <Link to="/verifications" className="alert-pill">{stats.badges.verifications} verifications</Link>
          )}
        </div>
      </header>

      <section className="ops-panel panel">
        <h3>WhatsApp & system health</h3>
        <div className="ops-grid">
          <span>WhatsApp: {stats.health?.whatsapp ? "✅ Connected" : "❌ Not configured"}</span>
          <span>Last webhook: {ops?.lastWebhookAt ? formatDate(ops.lastWebhookAt) : "—"}</span>
          <span>Messages (24h): {ops?.messagesLast24h ?? 0}</span>
          <span>AI failures (24h): {ops?.aiFailuresLast24h ?? 0}</span>
        </div>
      </section>

      <section className="stat-grid">
        <StatCard label="Total users" value={stats.users.total} sub={`+${stats.users.newToday} today`} accent="blue" />
        <StatCard label="Landlords" value={stats.users.landlords} accent="green" />
        <StatCard label="Active listings" value={stats.listings.active} sub={`${stats.listings.flagged} flagged`} accent="gold" />
        <StatCard label="Earnings (month)" value={formatRwf(stats.revenue.earningsThisMonthRwf)} accent="gold" />
        <StatCard label="Unlocks today" value={stats.revenue.unlocksToday} sub={formatRwf(stats.revenue.earningsTodayRwf)} accent="green" />
        <StatCard label="Pending reviews" value={stats.moderation.pendingReviews} accent="red" />
      </section>

      {charts && (
        <div className="two-col">
          <section className="panel">
            <h3>Unlocks (30 days)</h3>
            <BarChart data={charts.unlocksByDay} labelKey="date" valueKey="count" />
          </section>
          <section className="panel">
            <h3>Signups (30 days)</h3>
            <BarChart
              data={charts.signupsByDay.map((d) => ({
                date: d.date,
                count: d.landlords + d.tenants,
              }))}
              labelKey="date"
              valueKey="count"
            />
          </section>
        </div>
      )}

      {charts && (
        <section className="panel">
          <h3>Conversion funnel</h3>
          <div className="funnel">
            <div><strong>{charts.funnel.searches}</strong> searches</div>
            <div>→</div>
            <div><strong>{charts.funnel.listingViews}</strong> listing views</div>
            <div>→</div>
            <div><strong>{charts.funnel.unlocks}</strong> unlocks</div>
          </div>
        </section>
      )}

      <div className="two-col">
        <section className="panel">
          <h3>Top neighbourhoods</h3>
          <ul className="bar-list">
            {stats.topNeighbourhoods.map((n) => (
              <li key={n.neighbourhood}>
                <span>{n.neighbourhood}</span>
                <strong>{n.count}</strong>
              </li>
            ))}
          </ul>
        </section>
        <section className="panel">
          <h3>Recent unlocks</h3>
          <table className="data-table compact">
            <thead><tr><th>House</th><th>Tenant</th><th>Amount</th></tr></thead>
            <tbody>
              {stats.recentUnlocks.map((u) => (
                <tr key={u.id}>
                  <td><code>{u.house_id}</code></td>
                  <td>{u.tenant_phone}</td>
                  <td>{formatRwf(u.amount_paid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
