import { useEffect, useState } from "react";
import { fetchPublicStats, formatCount, type PublicStats } from "../api";
import type { Lang } from "../i18n";
import { t } from "../i18n";

export default function LiveStats({ lang }: { lang: Lang }) {
  const c = t(lang);
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      fetchPublicStats()
        .then((data) => {
          if (!cancelled) {
            setStats(data);
            setError(false);
          }
        })
        .catch(() => {
          if (!cancelled) setError(true);
        });
    };

    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const listings = stats?.listings;
  const users = stats?.users;

  const metrics = stats
    ? [
        { value: formatCount(listings!.available), label: c.stats.available },
        { value: formatCount(listings!.residential), label: c.stats.residential },
        { value: formatCount(listings!.commercial), label: c.stats.commercial },
        { value: formatCount(users!.tenants), label: c.stats.tenants },
        { value: formatCount(users!.landlords), label: c.stats.landlords },
        { value: formatCount(users!.newThisWeek), label: c.stats.newThisWeek },
      ]
    : null;

  return (
    <section className="metrics" id="stats">
      <div className="container">
        <header className="section-head section-head--left metrics__head">
          <div>
            <p className="eyebrow">{c.stats.live}</p>
            <h2>{c.stats.title}</h2>
            <p className="section-desc">{c.stats.subtitle}</p>
          </div>
          {stats && (
            <time className="metrics__time" dateTime={stats.updatedAt}>
              {c.stats.updated}{" "}
              {new Date(stats.updatedAt).toLocaleTimeString(lang === "fr" ? "fr-FR" : "en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
          )}
        </header>

        {error && !stats && <p className="metrics__error">{c.stats.unavailable}</p>}

        <div className="metrics__row" aria-busy={!stats}>
          {(metrics ?? Array.from({ length: 6 }, () => null)).map((item, i) => (
            <div key={item?.label ?? i} className={`metric${item ? "" : " metric--skeleton"}`}>
              {item ? (
                <>
                  <span className="metric__value">{item.value}</span>
                  <span className="metric__label">{item.label}</span>
                </>
              ) : (
                <>
                  <span className="metric__value">&nbsp;</span>
                  <span className="metric__label">&nbsp;</span>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
