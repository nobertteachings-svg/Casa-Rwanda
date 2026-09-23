import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { InboxItem, ReviewRow } from "../types";
import { formatDate, statusClass } from "../utils";

export default function Moderation() {
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [showResolved, setShowResolved] = useState(false);
  const [view, setView] = useState<"inbox" | "reviews">("inbox");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  function load() {
    setLoading(true);
    Promise.all([
      api.getInbox(),
      api.getReviews(showResolved),
    ])
      .then(([inboxData, reviewData]) => {
        setInbox(inboxData.items);
        setReviews(reviewData.reviews);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [showResolved]);

  async function resolve(reviewId: string) {
    setUpdating(reviewId);
    try {
      await api.resolveReview(reviewId);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setUpdating(null);
    }
  }

  async function setHouseStatus(houseId: string, status: string) {
    setUpdating(houseId);
    try {
      await api.updateHouseStatus(houseId, status);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>Moderation</h2>
          <p>Unified ops inbox — fraud, flags, reviews, duplicates</p>
        </div>
        <div className="toggle-group">
          <button type="button" className={view === "inbox" ? "active" : ""} onClick={() => setView("inbox")}>
            Inbox ({inbox.length})
          </button>
          <button type="button" className={view === "reviews" ? "active" : ""} onClick={() => setView("reviews")}>
            Reviews
          </button>
          <button type="button" className={!showResolved ? "active" : ""} onClick={() => setShowResolved(false)}>Pending</button>
          <button type="button" className={showResolved ? "active" : ""} onClick={() => setShowResolved(true)}>Resolved</button>
        </div>
      </header>

      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="page-loading">Loading…</p>
      ) : view === "inbox" ? (
        inbox.length === 0 ? (
          <div className="panel empty-state"><p>All clear — inbox empty.</p></div>
        ) : (
          <div className="inbox-list">
            {inbox.map((item) => (
              <article key={`${item.type}-${item.id}`} className={`inbox-card severity-${item.severity}`}>
                <div className="inbox-header">
                  <span className="inbox-type">{item.type.replace(/_/g, " ")}</span>
                  <span className={`badge badge-severity-${item.severity}`}>{item.severity}</span>
                  <time className="muted">{formatDate(item.created_at)}</time>
                </div>
                <p><strong>{item.title}</strong> — {item.message}</p>
                <div className="actions">
                  {item.type === "id_verification" && (
                    <Link to="/verifications">Open verifications →</Link>
                  )}
                  {item.type === "review" && (
                    <>
                      <button type="button" disabled={updating === item.id} onClick={() => resolve(item.id)}>Resolve</button>
                      <button type="button" onClick={() => setHouseStatus(item.target_id, "inactive")}>Remove listing</button>
                    </>
                  )}
                  {item.type === "house_review" && (
                    <button type="button" onClick={() => setHouseStatus(item.target_id, "active")}>Approve</button>
                  )}
                  {item.type === "duplicate" && (
                    <Link to={`/listings?house=${item.target_id}`}>Inspect →</Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        )
      ) : reviews.length === 0 ? (
        <div className="panel empty-state"><p>{showResolved ? "No resolved reviews." : "No pending reviews."}</p></div>
      ) : (
        <div className="review-list">
          {reviews.map((r) => (
            <article key={r.id} className={`review-card severity-${r.severity}`}>
              <div className="review-header">
                <code>{r.house_id}</code>
                <span className={statusClass(r.house_status)}>{r.house_status.replace("_", " ")}</span>
                <span className={`badge badge-severity-${r.severity}`}>{r.severity}</span>
                <time className="muted">{formatDate(r.created_at)}</time>
              </div>
              <p className="review-type">{r.review_type.replace(/_/g, " ")}</p>
              <p className="review-message">{r.message}</p>
              {!showResolved && (
                <div className="actions">
                  <button type="button" disabled={updating === r.id} onClick={() => resolve(r.id)}>Mark resolved</button>
                  <button type="button" onClick={() => setHouseStatus(r.house_id, "active")}>Approve</button>
                  <button type="button" className="btn-danger" onClick={() => setHouseStatus(r.house_id, "inactive")}>Remove</button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
