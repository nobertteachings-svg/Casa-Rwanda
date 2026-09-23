import { useEffect, useRef, useState } from "react";
import LiveShowcase from "./components/LiveShowcase";
import LiveStats from "./components/LiveStats";
import SocialLinks from "./components/SocialLinks";
import { type Lang, t } from "./i18n";
import { casaWhatsAppDisplay, casaWhatsAppPhone, casaWhatsAppUrl } from "./whatsapp";

const WHATSAPP_PHONE = casaWhatsAppPhone(import.meta.env.VITE_WHATSAPP_PHONE);
const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL ?? "hello@casahomesrwanda.com";
const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL ?? "support@casahomesrwanda.com";
const IOS_APP_URL =
  import.meta.env.VITE_IOS_APP_URL ?? "https://apps.apple.com/search?term=Casa%20Rwanda";
const ANDROID_APP_URL =
  import.meta.env.VITE_ANDROID_APP_URL ??
  "https://play.google.com/store/apps/details?id=com.casahomesrwanda.app";
const WHATSAPP_DIRECT = casaWhatsAppUrl();
const WHATSAPP_DISPLAY = casaWhatsAppDisplay(WHATSAPP_PHONE);

function whatsAppUrl(message: string): string {
  return casaWhatsAppUrl(message);
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
      />
    </svg>
  );
}

function WaButton({
  message,
  children,
  variant = "primary",
  className = "",
}: {
  message: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}) {
  return (
    <a
      href={whatsAppUrl(message)}
      className={`btn btn--${variant} ${className}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <WhatsAppIcon />
      {children}
    </a>
  );
}

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal ${className}`}>
      {children}
    </div>
  );
}

export default function App() {
  const lang: Lang = "en";
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const c = t(lang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { href: "#listings", label: c.nav.listings },
    { href: "#how", label: c.nav.how },
    { href: "#tenants", label: c.nav.tenants },
    { href: "#landlords", label: c.nav.landlords },
    { href: "#faq", label: c.nav.faq },
  ];

  return (
    <div className="site">
      <header
        className={`header${menuOpen ? " header--open" : ""}${scrolled ? " header--scrolled" : ""}`}
      >
        <div className="container header__inner">
          <a href="#" className="logo-link" onClick={() => setMenuOpen(false)}>
            <img src="/casa_logo_mark.png" alt="" className="logo-mark" />
            <span className="logo-word">Casa Rwanda</span>
          </a>

          <nav className="nav nav--desktop" aria-label="Main">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>

          <div className="header__actions">
            <a href="#apps" className="btn btn--ghost header-cta">
              {c.nav.cta}
            </a>
            <button
              type="button"
              className="menu-toggle"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>

        <div className="nav-mobile" aria-hidden={!menuOpen}>
          <nav className="nav nav--mobile" aria-label="Mobile">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
                {link.label}
              </a>
            ))}
            <a href="#apps" className="btn btn--primary nav-mobile__cta" onClick={() => setMenuOpen(false)}>
              {c.nav.cta}
            </a>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero__media" aria-hidden="true">
            <div className="hero__photo" />
            <div className="hero__veil" />
            <div className="hero__grain" />
          </div>
          <div className="container hero__inner">
            <p className="hero__brand">Casa Rwanda</p>
            <p className="hero__welcome">{c.hero.welcome}</p>
            <h1 className="hero__title">{c.hero.title}</h1>
            <p className="hero__lead">{c.hero.subtitle}</p>
            <div className="hero__actions">
              <a href={IOS_APP_URL} className="btn btn--primary" target="_blank" rel="noopener noreferrer">
                {c.hero.ctaIos}
              </a>
              <a href={ANDROID_APP_URL} className="btn btn--secondary" target="_blank" rel="noopener noreferrer">
                {c.hero.ctaAndroid}
              </a>
            </div>
            <div className="hero__actions hero__actions--secondary">
              <WaButton message={c.wa.tenant} variant="ghost">
                {c.hero.ctaTenant}
              </WaButton>
              <WaButton message={c.wa.landlord} variant="ghost">
                {c.hero.ctaLandlord}
              </WaButton>
            </div>
          </div>
        </section>

        <LiveShowcase lang={lang} whatsAppUrl={whatsAppUrl(c.wa.tenant)} />

        <Reveal>
          <section id="how" className="section">
            <div className="container">
              <header className="section-head">
                <p className="eyebrow">{c.how.eyebrow}</p>
                <h2>{c.how.title}</h2>
                <p className="section-desc">{c.how.subtitle}</p>
              </header>
              <ol className="steps">
                {c.how.steps.map((step, i) => (
                  <li key={step.title} className="step">
                    <span className="step__num">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section id="tenants" className="section section--tone">
            <div className="container audience">
              <div className="audience__copy">
                <p className="eyebrow">{c.tenants.eyebrow}</p>
                <h2>{c.tenants.title}</h2>
                <ul className="bullet-list">
                  {c.tenants.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
                <WaButton message={c.wa.tenant}>{c.tenants.cta}</WaButton>
              </div>
              <aside className="audience__panel" aria-label={c.tenants.preview.label}>
                <p className="audience__panel-label">{c.tenants.preview.label}</p>
                <dl>
                  <div>
                    <dt>{c.tenants.preview.areaLabel}</dt>
                    <dd>{c.tenants.preview.area}</dd>
                  </div>
                  <div>
                    <dt>{c.tenants.preview.budgetLabel}</dt>
                    <dd>{c.tenants.preview.budget}</dd>
                  </div>
                  <div>
                    <dt>{c.tenants.preview.resultLabel}</dt>
                    <dd>{c.tenants.preview.result}</dd>
                  </div>
                </dl>
              </aside>
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section id="landlords" className="section">
            <div className="container audience audience--reverse">
              <div className="audience__copy">
                <p className="eyebrow">{c.landlords.eyebrow}</p>
                <h2>{c.landlords.title}</h2>
                <ul className="bullet-list">
                  {c.landlords.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
                <WaButton message={c.wa.landlord}>{c.landlords.cta}</WaButton>
              </div>
              <aside className="audience__video" aria-label={c.landlords.video.label}>
                <p className="audience__panel-label">{c.landlords.video.label}</p>
                <p className="audience__video-title">{c.landlords.video.title}</p>
                <video
                  className="audience__video-player"
                  controls
                  playsInline
                  preload="metadata"
                  src="/english.mp4"
                >
                  Your browser does not support video playback.
                </video>
              </aside>
            </div>
          </section>
        </Reveal>

        <Reveal>
          <LiveStats lang={lang} />
        </Reveal>

        <Reveal>
          <section className="section section--tone">
            <div className="container">
              <header className="section-head section-head--left">
                <p className="eyebrow">{c.cities.eyebrow}</p>
                <h2>{c.cities.title}</h2>
                <p className="section-desc">{c.cities.subtitle}</p>
              </header>
              <p className="city-rail-label">{c.cities.kigaliLabel}</p>
              <ul className="city-rail">
                {c.cities.kigali.map((area) => (
                  <li key={area}>{area}</li>
                ))}
              </ul>
              <p className="city-rail-label">{c.cities.townsLabel}</p>
              <ul className="city-rail">
                {c.cities.list.map((city) => (
                  <li key={city}>{city}</li>
                ))}
              </ul>
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section id="faq" className="section">
            <div className="container faq-layout">
              <header className="section-head section-head--left">
                <p className="eyebrow">{c.faq.eyebrow}</p>
                <h2>{c.faq.title}</h2>
              </header>
              <div className="faq-list">
                {c.faq.items.map((item) => (
                  <details key={item.q} className="faq-item">
                    <summary>{item.q}</summary>
                    <p>{item.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        </Reveal>

        <section id="apps" className="cta-band">
          <div className="container cta-band__inner">
            <div>
              <p className="eyebrow eyebrow--on-dark">{c.apps.eyebrow}</p>
              <h2>{c.cta.title}</h2>
              <p>{c.cta.subtitle}</p>
            </div>
            <div className="cta-band__actions">
              <a href={IOS_APP_URL} className="btn btn--primary" target="_blank" rel="noopener noreferrer">
                {c.apps.ios}
              </a>
              <a href={ANDROID_APP_URL} className="btn btn--secondary" target="_blank" rel="noopener noreferrer">
                {c.apps.android}
              </a>
              <WaButton message={c.wa.tenant} variant="ghost">
                {c.apps.whatsapp}
              </WaButton>
            </div>
          </div>
        </section>

        <section id="help" className="section section--tone">
          <div className="container help">
            <header className="section-head">
              <p className="eyebrow">{c.help.eyebrow}</p>
              <h2>{c.help.title}</h2>
              <p className="section-desc">{c.help.subtitle}</p>
            </header>
            <div className="help__grid">
              <a className="help__link" href={WHATSAPP_DIRECT} target="_blank" rel="noopener noreferrer">
                <span>{c.help.whatsapp}</span>
                <strong>{WHATSAPP_DISPLAY}</strong>
              </a>
              <a className="help__link" href={`mailto:${CONTACT_EMAIL}`}>
                <span>{c.help.general}</span>
                <strong>{CONTACT_EMAIL}</strong>
              </a>
              <a className="help__link" href={`mailto:${SUPPORT_EMAIL}`}>
                <span>{c.help.support}</span>
                <strong>{SUPPORT_EMAIL}</strong>
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer__grid">
          <div>
            <a href="#" className="footer__brand">
              <img src="/casa_logo_mark.png" alt="" className="footer__mark" />
              <span>Casa Rwanda</span>
            </a>
            <p className="footer__tagline">{c.footer.tagline}</p>
          </div>
          <div className="footer__meta">
            <p className="footer__meta-label">{c.footer.contact}</p>
            <a href={WHATSAPP_DIRECT} target="_blank" rel="noopener noreferrer">
              WhatsApp · {WHATSAPP_DISPLAY}
            </a>
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            <p className="footer__meta-label">{c.footer.legal}</p>
            <a href="/privacy/">{c.footer.privacy}</a>
            <a href="/terms/">{c.footer.terms}</a>
            <a href="/delete-account/">{c.footer.deleteAccount}</a>
          </div>
          <div className="footer__social">
            <SocialLinks heading={c.footer.social} />
            <p className="footer__fine">{c.footer.rights}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
