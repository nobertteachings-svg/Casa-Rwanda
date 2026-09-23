import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useApp } from "../context/AppContext";
import { MediaImage } from "../components/MediaImage";
import type { IdVerification } from "../types";
import { formatDate } from "../utils";

export default function Verifications() {
  const { refreshBadges } = useApp();
  const [items, setItems] = useState<IdVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<IdVerification | null>(null);

  function load() {
    setLoading(true);
    api
      .getVerifications()
      .then((d) => setItems(d.verifications))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function runAiAll() {
    setBusy("all");
    try {
      await api.aiReviewAllVerifications();
      load();
      refreshBadges();
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI failed");
    } finally {
      setBusy(null);
    }
  }

  async function approve(id: string) {
    setBusy(id);
    try {
      await api.approveVerification(id);
      load();
      refreshBadges();
      setSelected(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  async function reject(id: string) {
    setBusy(id);
    try {
      await api.rejectVerification(id, "Rejected by admin");
      load();
      refreshBadges();
      setSelected(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  async function runAi(id: string) {
    setBusy(`ai-${id}`);
    try {
      await api.aiReviewVerification(id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>ID Verifications</h2>
          <p>AI-assisted landlord identity review</p>
        </div>
        <button type="button" className="btn-primary" disabled={busy === "all"} onClick={runAiAll}>
          {busy === "all" ? "Running AI…" : "🤖 Run AI on all pending"}
        </button>
      </header>

      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="page-loading">Loading…</p>
      ) : items.length === 0 ? (
        <div className="panel empty-state"><p>All clear — no pending verifications.</p></div>
      ) : (
        <div className="verify-grid">
          {items.map((v) => (
            <article key={v.id} className="verify-card panel">
              <div className="verify-split">
                <div className="verify-media">
                  <MediaImage refId={v.media_reference} alt="ID front" />
                  {v.media_reference_back && (
                    <MediaImage refId={v.media_reference_back} alt="ID back" />
                  )}
                </div>
                <div>
                  <p><strong>{v.full_name ?? "Unknown name"}</strong></p>
                  <p className="muted">{v.landlord_phone}</p>
                  <p>ID #: {v.id_number ?? "—"} · Exp: {v.expiry_date ?? "—"}</p>
                  <p>{v.document_type ?? "document"} · {v.listing_count} listing(s)</p>
                  {v.claude_analysis && (
                    <p className="ai-hint">
                      AI: {v.claude_analysis.confidence ?? "?"} confidence
                      {v.claude_analysis.rejection_reason && ` — ${v.claude_analysis.rejection_reason}`}
                    </p>
                  )}
                  <time className="muted">{formatDate(v.created_at)}</time>
                  <div className="actions">
                    <button type="button" onClick={() => setSelected(v)}>Review</button>
                    <button type="button" disabled={!!busy} onClick={() => runAi(v.id)}>🤖 AI</button>
                    <button type="button" disabled={!!busy} onClick={() => approve(v.id)}>Approve</button>
                    <button type="button" className="btn-danger" disabled={!!busy} onClick={() => reject(v.id)}>Reject</button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {selected && (
        <div className="drawer-backdrop" onClick={() => setSelected(null)} role="presentation">
          <aside className="drawer" onClick={(e) => e.stopPropagation()}>
            <header className="drawer-header">
              <h3>Verification — {selected.landlord_phone}</h3>
              <button type="button" className="drawer-close" onClick={() => setSelected(null)}>×</button>
            </header>
            <div className="drawer-body verify-detail">
              <p className="muted">Front</p>
              <MediaImage refId={selected.media_reference} alt="ID front" />
              {selected.media_reference_back && (
                <>
                  <p className="muted">Back</p>
                  <MediaImage refId={selected.media_reference_back} alt="ID back" />
                </>
              )}
              <p>Name: {selected.full_name ?? "—"}</p>
              <p>ID #: {selected.id_number ?? "—"}</p>
              <p>Expires: {selected.expiry_date ?? "—"}</p>
              <div className="actions">
                <button type="button" onClick={() => runAi(selected.id)}>🤖 Re-run AI check</button>
                <button type="button" onClick={() => approve(selected.id)}>Approve</button>
                <button type="button" className="btn-danger" onClick={() => reject(selected.id)}>Reject</button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
