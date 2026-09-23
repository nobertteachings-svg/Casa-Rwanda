import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { Drawer } from "../components/Drawer";
import { MediaImage } from "../components/MediaImage";
import { RiskBadge } from "../components/RiskBadge";
import type { HouseDetail, HouseRow, ListingAiReview } from "../types";
import { formatListingPrice, statusClass } from "../utils";

export default function Listings() {
  const [searchParams] = useSearchParams();
  const [houses, setHouses] = useState<HouseRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: "all", city: "", region: "", category: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [selected, setSelected] = useState<HouseDetail | null>(null);
  const [aiReview, setAiReview] = useState<ListingAiReview | null>(null);
  const [revealContact, setRevealContact] = useState(false);
  const [photoUrlsText, setPhotoUrlsText] = useState("");
  const [photoMsg, setPhotoMsg] = useState("");

  function load() {
    setLoading(true);
    const f: Record<string, string> = {};
    if (filters.status !== "all") f.status = filters.status;
    if (filters.city) f.city = filters.city;
    if (filters.region) f.region = filters.region;
    if (filters.category) f.category = filters.category;
    api
      .getHouses(page, f)
      .then((data) => {
        setHouses(data.houses);
        setTotal(data.total);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [page, filters]);

  useEffect(() => {
    const id = searchParams.get("house");
    if (id) openHouse(id);
  }, [searchParams]);

  async function openHouse(id: string) {
    setAiReview(null);
    setRevealContact(false);
    setPhotoUrlsText("");
    setPhotoMsg("");
    try {
      setSelected(await api.getHouse(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  async function repairPhotos(houseId: string) {
    setUpdating(`photos-${houseId}`);
    setPhotoMsg("");
    try {
      const result = await api.repairHousePhotos(houseId);
      setPhotoMsg(
        `Repaired: ${result.promoted} promoted to Cloudinary, ${result.removed} dead refs removed.`
      );
      await openHouse(houseId);
      load();
    } catch (err) {
      setPhotoMsg(err instanceof Error ? err.message : "Repair failed");
    } finally {
      setUpdating(null);
    }
  }

  async function replacePhotos(houseId: string) {
    const imageUrls = photoUrlsText
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter(Boolean);
    if (imageUrls.length === 0) {
      setPhotoMsg("Paste at least one https image URL.");
      return;
    }
    setUpdating(`photos-${houseId}`);
    setPhotoMsg("");
    try {
      const result = await api.replaceHousePhotos(houseId, imageUrls);
      setPhotoMsg(`Saved ${result.photos.length} permanent photo(s) to Cloudinary.`);
      setPhotoUrlsText("");
      await openHouse(houseId);
      load();
    } catch (err) {
      setPhotoMsg(err instanceof Error ? err.message : "Replace failed");
    } finally {
      setUpdating(null);
    }
  }

  async function changeStatus(houseId: string, newStatus: string) {
    setUpdating(houseId);
    try {
      await api.updateHouseStatus(houseId, newStatus);
      load();
      if (selected?.house.house_id === houseId) openHouse(houseId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setUpdating(null);
    }
  }

  async function runAi(houseId: string) {
    setUpdating(`ai-${houseId}`);
    try {
      setAiReview(await api.aiReviewHouse(houseId));
    } finally {
      setUpdating(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / 20));
  const h = selected?.house;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>Listings</h2>
          <p>{total.toLocaleString()} properties on Casa Rwanda</p>
        </div>
        <div className="header-actions filters-row">
          <select value={filters.status} onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="flagged">Flagged</option>
            <option value="under_review">Under review</option>
            <option value="inactive">Inactive</option>
          </select>
          <input placeholder="City" value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })} />
          <input placeholder="Region" value={filters.region} onChange={(e) => setFilters({ ...filters, region: e.target.value })} />
          <select value={filters.category} onChange={(e) => { setFilters({ ...filters, category: e.target.value }); setPage(1); }}>
            <option value="">All types</option>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="house_sale">House for sale</option>
            <option value="land">Land for sale</option>
          </select>
          <button type="button" onClick={() => { setPage(1); load(); }}>Apply</button>
          <button type="button" onClick={() => api.exportCsv("houses")}>Export</button>
        </div>
      </header>

      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="page-loading">Loading listings…</p>
      ) : (
        <>
          <div className="panel table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Landlord</th>
                  <th>Type</th>
                  <th>Price</th>
                  <th>Area</th>
                  <th>Status</th>
                  <th>Reviews</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {houses.map((house) => (
                  <tr key={house.house_id}>
                    <td><code>{house.house_id}</code></td>
                    <td>{house.landlord_phone}</td>
                    <td>{house.property_subtype?.replace(/_/g, " ") ?? house.type}</td>
                    <td>{formatListingPrice(house.rent, house.property_category)}</td>
                    <td>{house.neighbourhood ?? house.city ?? "—"}</td>
                    <td><span className={statusClass(house.status)}>{house.status.replace("_", " ")}</span></td>
                    <td>{house.review_count > 0 ? house.review_count : "—"}</td>
                    <td>
                      <button type="button" onClick={() => openHouse(house.house_id)}>View</button>
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

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={h?.house_id ?? "Listing"}>
        {selected && h && (
          <div className="house-detail">
            {selected.risk && <RiskBadge risk={selected.risk} />}
            <p><strong>{formatListingPrice(h.rent, h.property_category)}</strong> · {h.property_category} / {h.property_subtype?.replace(/_/g, " ")}</p>
            <p>{h.region} → {h.town ?? h.city} → {h.neighbourhood}</p>
            <p>Electricity: {h.electricity_meter ?? "—"} · Trust: {h.trust_tier ?? "standard"}</p>
            <p>
              Landlord: {revealContact ? h.landlord_phone : `${h.landlord_phone.slice(0, 6)}••••`}
              <button type="button" className="btn-link" onClick={() => setRevealContact(true)}>Reveal</button>
            </p>
            <a href={`https://www.google.com/maps?q=${h.latitude},${h.longitude}`} target="_blank" rel="noreferrer">
              📍 View GPS pin on map
            </a>
            <div className="photo-grid">
              {(h.photos ?? []).map((p) => (
                <MediaImage key={p} refId={p} alt="Listing photo" />
              ))}
            </div>
            {(h.photos ?? []).some((p) => p.startsWith("wa-media:")) && (
              <p className="muted">
                Some photos are temporary WhatsApp refs and will not show on the marketing site.
                Repair (if still on Meta) or paste permanent image URLs below.
              </p>
            )}
            <div className="photo-repair">
              <label htmlFor="photo-urls">Replace photos (one https URL per line)</label>
              <textarea
                id="photo-urls"
                rows={3}
                value={photoUrlsText}
                onChange={(e) => setPhotoUrlsText(e.target.value)}
                placeholder="https://…jpg"
              />
              {photoMsg && <p className="muted">{photoMsg}</p>}
              <div className="actions">
                <button
                  type="button"
                  disabled={!!updating}
                  onClick={() => repairPhotos(h.house_id)}
                >
                  Repair wa-media
                </button>
                <button
                  type="button"
                  disabled={!!updating}
                  onClick={() => replacePhotos(h.house_id)}
                >
                  Upload URLs to Cloudinary
                </button>
              </div>
            </div>
            {h.ai_description && <p className="muted">{h.ai_description}</p>}
            {aiReview && (
              <div className={`ai-review ai-${aiReview.risk_level}`}>
                <strong>🤖 AI: {aiReview.recommendation}</strong>
                <p>{aiReview.summary}</p>
                <ul>{aiReview.flags.map((f) => <li key={f}>{f}</li>)}</ul>
              </div>
            )}
            <div className="actions">
              <button type="button" disabled={!!updating} onClick={() => runAi(h.house_id)}>🤖 AI review</button>
              <button type="button" disabled={updating === h.house_id} onClick={() => changeStatus(h.house_id, "active")}>Approve</button>
              <button type="button" className="btn-danger" disabled={updating === h.house_id} onClick={() => changeStatus(h.house_id, "inactive")}>Remove</button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
