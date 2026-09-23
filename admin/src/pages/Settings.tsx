import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { formatRwf } from "../utils";

export default function SettingsPage() {
  const [fee, setFee] = useState(2000);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getSettings().then((s) => setFee(s.unlockFeeRwf)).catch(() => {});
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.setUnlockFee(fee);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>Settings</h2>
          <p>Platform pricing and configuration</p>
        </div>
      </header>

      <form className="panel settings-form" onSubmit={handleSubmit}>
        <h3>Unlock fee</h3>
        <p className="muted">Amount tenants pay to unlock landlord contact (RWF)</p>
        <label>
          Fee (RWF)
          <input type="number" min={500} step={500} value={fee} onChange={(e) => setFee(parseInt(e.target.value, 10))} />
        </label>
        <p>Preview: {formatRwf(fee)} per unlock</p>
        {error && <p className="error">{error}</p>}
        {saved && <p className="success">Saved — takes effect on new unlocks</p>}
        <button type="submit" className="btn-primary">Save pricing</button>
      </form>

      <section className="panel">
        <h3>Session</h3>
        <p className="muted">Browser sessions expire after 8 hours. The admin API key is never stored locally.</p>
      </section>
    </div>
  );
}
