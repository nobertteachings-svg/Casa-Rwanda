import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

export default function GlobalSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{
    users: Array<{ phone: string; role: string; display_name: string | null }>;
    houses: Array<{ house_id: string; neighbourhood: string | null }>;
  } | null>(null);

  useEffect(() => {
    if (q.length < 2) {
      setResults(null);
      return;
    }
    const t = setTimeout(() => {
      api.search(q).then(setResults).catch(() => setResults(null));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="global-search">
      <input
        type="search"
        placeholder="Search phone, house ID, area…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {results && (
        <div className="search-results">
          {results.users.map((u) => (
            <Link key={u.phone} to={`/users?phone=${u.phone}`} onClick={() => setQ("")}>
              👤 {u.display_name ?? u.phone} {u.display_name ? `(${u.phone})` : ""} · {u.role}
            </Link>
          ))}
          {results.houses.map((h) => (
            <Link key={h.house_id} to={`/listings?house=${h.house_id}`} onClick={() => setQ("")}>
              🏠 {h.house_id} — {h.neighbourhood ?? "?"}
            </Link>
          ))}
          {!results.users.length && !results.houses.length && (
            <p className="muted">No results</p>
          )}
        </div>
      )}
    </div>
  );
}
