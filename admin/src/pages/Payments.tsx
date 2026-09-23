import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { PaymentRow } from "../types";
import { formatDate, formatUgx } from "../utils";

export default function Payments() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [byMethod, setByMethod] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [disputedOnly, setDisputedOnly] = useState(false);
  const [tenant, setTenant] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    const filters: Record<string, string> = {};
    if (disputedOnly) filters.disputed = "true";
    if (tenant) filters.tenant = tenant;
    api
      .getPayments(page, filters)
      .then((d) => {
        setPayments(d.payments);
        setTotal(d.total);
        setByMethod(d.byMethod);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [page, disputedOnly]);

  async function dispute(id: string) {
    const reason = prompt("Dispute reason:");
    if (!reason) return;
    await api.disputePayment(id, reason, confirm("Flag for refund?"));
    load();
  }

  const totalPages = Math.max(1, Math.ceil(total / 30));

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>Payments</h2>
          <p>{total} unlock payments</p>
        </div>
        <div className="header-actions">
          <input placeholder="Tenant phone" value={tenant} onChange={(e) => setTenant(e.target.value)} />
          <button type="button" onClick={() => { setPage(1); load(); }}>Filter</button>
          <label className="toggle-inline">
            <input type="checkbox" checked={disputedOnly} onChange={(e) => { setDisputedOnly(e.target.checked); setPage(1); }} />
            Disputed only
          </label>
          <button type="button" onClick={() => api.exportCsv("unlocks")}>Export CSV</button>
        </div>
      </header>

      <section className="stat-grid compact">
        {Object.entries(byMethod).map(([method, amount]) => (
          <div key={method} className="panel stat-mini">
            <span className="muted">{method}</span>
            <strong>{formatUgx(amount)}</strong>
          </div>
        ))}
      </section>

      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="page-loading">Loading…</p>
      ) : (
        <>
          <div className="panel table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>House</th>
                  <th>Area</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>When</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className={p.disputed ? "row-disputed" : ""}>
                    <td>{p.tenant_phone}</td>
                    <td><code>{p.house_id}</code></td>
                    <td>{p.neighbourhood ?? "—"}</td>
                    <td>{formatUgx(p.amount_paid)}</td>
                    <td>{p.payment_method ?? "—"}</td>
                    <td className="muted">{formatDate(p.paid_at)}</td>
                    <td>
                      {!p.disputed && (
                        <button type="button" className="btn-danger btn-sm" onClick={() => dispute(p.id)}>
                          Dispute
                        </button>
                      )}
                      {p.disputed && <span className="badge badge-severity-warning">Disputed</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
            <span>{page} / {totalPages}</span>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </>
      )}
    </div>
  );
}
