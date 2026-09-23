import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchPublicListings,
  formatRent,
  mediaSrc,
  mediaThumb,
  propertyLabel,
  type PublicListing,
} from "../api";
import type { Lang } from "../i18n";
import { t } from "../i18n";

const SLIDE_MS = 4500;
const REFRESH_MS = 120_000;

interface Slide {
  listing: PublicListing;
  mediaIndex: number;
  type: "image" | "video";
  url: string;
  thumbUrl: string;
}

function buildSlides(listings: PublicListing[]): Slide[] {
  const slides: Slide[] = [];
  for (const listing of listings) {
    listing.media.forEach((item, mediaIndex) => {
      // Marketing carousel prioritizes photos for fast loads.
      if (item.type !== "image") return;
      slides.push({
        listing,
        mediaIndex,
        type: item.type,
        url: item.url,
        thumbUrl: item.thumbUrl || item.url,
      });
    });
  }
  return slides;
}

export default function LiveShowcase({
  lang,
  whatsAppUrl,
}: {
  lang: Lang;
  whatsAppUrl: string;
}) {
  const c = t(lang);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    fetchPublicListings()
      .then((data) => {
        const next = buildSlides(data.listings);
        setSlides(next);
        setIndex((i) => (next.length ? i % next.length : 0));
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, SLIDE_MS);
    return () => clearInterval(id);
  }, [slides.length]);

  const current = slides[index];

  // Only mount current + neighbours so we don't download every listing at once.
  const visibleIndexes = useMemo(() => {
    if (!slides.length) return [] as number[];
    const set = new Set<number>([index]);
    if (slides.length > 1) set.add((index + 1) % slides.length);
    if (slides.length > 2) set.add((index - 1 + slides.length) % slides.length);
    return [...set];
  }, [slides.length, index]);

  const upcoming = useMemo(() => {
    if (!slides.length) return [];
    const items: Slide[] = [];
    for (let i = 1; i <= Math.min(4, slides.length - 1); i++) {
      items.push(slides[(index + i) % slides.length]);
    }
    return items;
  }, [slides, index]);

  // Preload the next full image in the background.
  useEffect(() => {
    if (slides.length < 2) return;
    const next = slides[(index + 1) % slides.length];
    const img = new Image();
    img.src = mediaSrc(next.url);
  }, [slides, index]);

  return (
    <section className="showcase" id="listings">
      <div className="container showcase__head">
        <div>
          <p className="section-label">{c.showcase.live}</p>
          <h2>{c.showcase.title}</h2>
          <p className="section-desc">{c.showcase.subtitle}</p>
        </div>
        {slides.length > 0 && (
          <p className="showcase__count">
            {slides.length} {c.showcase.mediaCount}
          </p>
        )}
      </div>

      <div className="showcase__stage">
        {loading && (
          <div className="showcase__empty" aria-busy="true">
            <div className="showcase__skeleton" />
          </div>
        )}

        {!loading && error && slides.length === 0 && (
          <div className="showcase__empty">
            <p>{c.showcase.unavailable}</p>
          </div>
        )}

        {!loading && !error && slides.length === 0 && (
          <div className="showcase__empty">
            <p>{c.showcase.empty}</p>
          </div>
        )}

        {current && (
          <div className="showcase__frame">
            {visibleIndexes.map((i) => {
              const slide = slides[i];
              return (
                <div
                  key={`${slide.listing.houseId}-${slide.mediaIndex}`}
                  className={`showcase__slide${i === index ? " showcase__slide--active" : ""}`}
                  aria-hidden={i !== index}
                >
                  <img
                    src={mediaSrc(slide.url)}
                    alt=""
                    className="showcase__media"
                    loading={i === index ? "eager" : "lazy"}
                    decoding="async"
                    fetchPriority={i === index ? "high" : "low"}
                  />
                </div>
              );
            })}

            <div className="showcase__overlay">
              <div className="showcase__meta">
                <span className="showcase__id">{current.listing.houseId}</span>
                <span className="showcase__type">
                  {propertyLabel(current.listing.type, lang)}
                  {current.listing.propertyCategory === "commercial"
                    ? ` · ${lang === "fr" ? "Commercial" : "Commercial"}`
                    : ""}
                </span>
                <p className="showcase__location">{current.listing.location}</p>
                <p className="showcase__rent">
                  {formatRent(current.listing.rent, lang)}
                  <span> / {lang === "fr" ? "mois" : "month"}</span>
                </p>
              </div>
              <a
                href={whatsAppUrl}
                className="btn btn--primary showcase__cta"
                target="_blank"
                rel="noopener noreferrer"
              >
                {c.showcase.cta}
              </a>
            </div>

            {slides.length > 1 && (
              <div className="showcase__progress" aria-hidden="true">
                {slides.map((_, i) => (
                  <span
                    key={i}
                    className={`showcase__dot${i === index ? " showcase__dot--active" : ""}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {upcoming.length > 0 && (
          <div className="showcase__filmstrip" aria-hidden="true">
            {upcoming.map((slide) => (
              <div key={`${slide.listing.houseId}-${slide.mediaIndex}`} className="showcase__thumb">
                <img
                  src={mediaThumb({ type: slide.type, url: slide.url, thumbUrl: slide.thumbUrl })}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
