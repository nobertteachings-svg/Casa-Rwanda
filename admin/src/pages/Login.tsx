import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithApiKey } from "../api/client";

export default function Login() {
  const navigate = useNavigate();
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await loginWithApiKey(key.trim());
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid API key. Check ADMIN_API_KEY in your .env file.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="brand brand--center">
          <img
            src="/casa_logo_lockup_horizontal.png"
            alt="Casa Rwanda"
            className="brand-logo"
          />
          <div>
            <h1>Admin</h1>
            <p>Platform dashboard</p>
          </div>
        </div>
        <label htmlFor="api-key">Admin API Key</label>
        <input
          id="api-key"
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Enter ADMIN_API_KEY"
          required
          autoFocus
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading || !key.trim()}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
        <p className="login-hint">
          Your key is exchanged for a short-lived session token and is not stored in the browser.
        </p>
      </form>
    </div>
  );
}
