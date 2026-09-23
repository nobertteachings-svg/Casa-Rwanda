import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { Drawer } from "../components/Drawer";
import { RiskBadge } from "../components/RiskBadge";
import type { UserDetail, UserRow } from "../types";
import { formatDate } from "../utils";

export default function Users() {
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [role, setRole] = useState("all");
  const [verified, setVerified] = useState("");
  const [suspended, setSuspended] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<UserDetail | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    api
      .getUsers(page, { role, verified, suspended })
      .then((data) => {
        setUsers(data.users);
        setTotal(data.total);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [page, role, verified, suspended]);

  useEffect(() => {
    const phone = searchParams.get("phone");
    if (phone) openUser(phone);
  }, [searchParams]);

  async function openUser(phone: string) {
    try {
      const detail = await api.getUser(phone);
      setSelected(detail);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load user");
    }
  }

  async function verifyLandlord(phone: string) {
    setBusy(true);
    try {
      await api.verifyUser(phone);
      if (selected) setSelected(await api.getUser(phone));
      load();
    } finally {
      setBusy(false);
    }
  }

  async function toggleSuspend(phone: string, suspend: boolean) {
    setBusy(true);
    try {
      await api.suspendUser(phone, suspend, suspend ? "Suspended by admin" : undefined);
      if (selected) setSelected(await api.getUser(phone));
      load();
    } finally {
      setBusy(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>Users</h2>
          <p>{total.toLocaleString()} registered users</p>
        </div>
        <div className="header-actions">
          <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
            <option value="all">All roles</option>
            <option value="landlord">Landlords</option>
            <option value="tenant">Tenants</option>
          </select>
          <select value={verified} onChange={(e) => { setVerified(e.target.value); setPage(1); }}>
            <option value="">Any verified</option>
            <option value="true">Verified</option>
            <option value="false">Unverified</option>
          </select>
          <select value={suspended} onChange={(e) => { setSuspended(e.target.value); setPage(1); }}>
            <option value="">Any status</option>
            <option value="true">Suspended</option>
            <option value="false">Active</option>
          </select>
          <button type="button" onClick={() => api.exportCsv("users")}>Export</button>
        </div>
      </header>

      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="page-loading">Loading users…</p>
      ) : (
        <>
          <div className="panel table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Phone</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Verified</th>
                  <th>Listings</th>
                  <th>Unlocks</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.phone} className={u.suspended ? "row-suspended" : ""} onClick={() => openUser(u.phone)} style={{ cursor: "pointer" }}>
                    <td><code>{u.phone}</code></td>
                    <td>{u.display_name ?? "—"}</td>
                    <td>{u.role}</td>
                    <td>{u.verified ? "✅" : "—"}</td>
                    <td>{u.listing_count}</td>
                    <td>{u.unlock_count}</td>
                    <td className="muted">{formatDate(u.created_at)}</td>
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

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.phone ?? "User"}>
        {selected && (
          <div className="user-detail">
            <p><strong>{selected.display_name ?? "No name"}</strong> · {selected.role} · {selected.language}</p>
            <p>Joined {formatDate(selected.created_at)}</p>
            {selected.verified && <p>✅ Verified ({selected.verification_method})</p>}
            {selected.suspended && <p className="error">⛔ Suspended: {selected.suspended_reason}</p>}
            {selected.risk && <RiskBadge risk={selected.risk} />}
            <div className="actions">
              {selected.role === "landlord" && !selected.verified && (
                <button type="button" disabled={busy} onClick={() => verifyLandlord(selected.phone)}>Verify landlord</button>
              )}
              <button type="button" disabled={busy} onClick={() => toggleSuspend(selected.phone, !selected.suspended)}>
                {selected.suspended ? "Unsuspend" : "Suspend"}
              </button>
            </div>
            <h4>Listings ({selected.listings.length})</h4>
            <ul className="mini-list">
              {selected.listings.map((h) => (
                <li key={h.house_id}><code>{h.house_id}</code> — {h.neighbourhood} — {h.status}</li>
              ))}
            </ul>
            <h4>Unlocks ({selected.unlocks.length})</h4>
            <ul className="mini-list">
              {selected.unlocks.map((u, i) => (
                <li key={i}><code>{u.house_id}</code> — {formatDate(u.paid_at)}</li>
              ))}
            </ul>
          </div>
        )}
      </Drawer>
    </div>
  );
}
