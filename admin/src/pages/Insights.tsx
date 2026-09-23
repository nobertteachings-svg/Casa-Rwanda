import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { MarketInsight } from "../types";
import { formatRwf } from "../utils";

export default function Insights() {
  const [data, setData] = useState<MarketInsight | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getInsights().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="page-loading">Loading insights…</p>;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>Market insights</h2>
          <p>Rent trends and supply vs demand</p>
        </div>
        <button type="button" onClick={() => api.exportCsv("houses")}>Export listings</button>
      </header>

      <div className="two-col">
        <section className="panel">
          <h3>Median rent by area</h3>
          <table className="data-table compact">
            <thead><tr><th>Area</th><th>Type</th><th>Median</th><th>n</th></tr></thead>
            <tbody>
              {data.medianRentByArea.map((r) => (
                <tr key={`${r.area}-${r.property_subtype}`}>
                  <td>{r.area}</td>
                  <td>{r.property_subtype.replace(/_/g, " ")}</td>
                  <td>{formatRwf(r.median_rent)}</td>
                  <td>{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel">
          <h3>Top search areas</h3>
          <ul className="bar-list">
            {data.topSearchAreas.map((s) => (
              <li key={s.query_text}>
                <span>{s.query_text}</span>
                <strong>{s.count}</strong>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="panel">
        <h3>Supply vs demand</h3>
        <table className="data-table compact">
          <thead><tr><th>Area</th><th>Listings</th><th>Searches</th><th>Gap</th></tr></thead>
          <tbody>
            {data.supplyDemand.map((r) => (
              <tr key={r.area} className={r.searches > r.listings * 2 ? "row-hot" : ""}>
                <td>{r.area}</td>
                <td>{r.listings}</td>
                <td>{r.searches}</td>
                <td>{r.searches - r.listings > 0 ? `+${r.searches - r.listings} demand` : "OK"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
