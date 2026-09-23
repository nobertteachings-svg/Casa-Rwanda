import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { AuditLogRow } from "../types";
import { formatDate } from "../utils";

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getAuditLog().then((d) => setLogs(d.logs)).catch((e) => setError(e.message));
  }, []);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>Audit log</h2>
          <p>Admin actions (key fingerprint only)</p>
        </div>
      </header>

      {error && <p className="error">{error}</p>}
      <div className="panel table-wrap">
        <table className="data-table compact">
          <thead>
            <tr><th>When</th><th>Admin</th><th>Action</th><th>Target</th><th>Details</th></tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="muted">{formatDate(l.created_at)}</td>
                <td><code>{l.admin_fingerprint}</code></td>
                <td>{l.action}</td>
                <td>{l.target_type} {l.target_id}</td>
                <td className="muted">{l.details ? JSON.stringify(l.details).slice(0, 80) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
