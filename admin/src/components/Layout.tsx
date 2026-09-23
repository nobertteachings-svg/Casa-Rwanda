import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { logout } from "../api/client";
import GlobalSearch from "./GlobalSearch";
import { useApp } from "../context/AppContext";
import { t } from "../i18n/strings";

const nav = [
  { to: "/", labelKey: "dashboard" as const, end: true, badge: null },
  { to: "/users", labelKey: "users" as const, badge: null },
  { to: "/listings", labelKey: "listings" as const, badge: null },
  { to: "/moderation", labelKey: "moderation" as const, badge: "moderation" as const },
  { to: "/verifications", labelKey: "verifications" as const, badge: "verifications" as const },
  { to: "/payments", labelKey: "payments" as const, badge: "payments_disputed" as const },
  { to: "/insights", labelKey: "insights" as const, badge: null },
  { to: "/settings", labelKey: "settings" as const, badge: null },
  { to: "/audit", labelKey: "audit" as const, badge: null },
];

export default function Layout() {
  const navigate = useNavigate();
  const { lang, badges, sidebarOpen, setSidebarOpen, setTheme, theme, touchSession } = useApp();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  function badgeCount(key: string | null) {
    if (!key || !badges) return 0;
    return badges[key as keyof typeof badges] ?? 0;
  }

  return (
    <div className="layout">
      <button
        type="button"
        className="mobile-menu-btn"
        aria-label={sidebarOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={sidebarOpen}
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        ☰
      </button>
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`} aria-label="Admin navigation">
        <div className="brand">
          <img
            src="/casa_logo_lockup_horizontal.png"
            alt="Casa Rwanda"
            className="brand-logo"
          />
          <div>
            <p>Admin</p>
          </div>
        </div>
        <GlobalSearch />
        <nav aria-label="Primary">
          {nav.map((item) => {
            const count = badgeCount(item.badge);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
                onClick={() => { setSidebarOpen(false); touchSession(); }}
              >
                {t(lang, item.labelKey)}
                {count > 0 && (
                  <span className="nav-badge" aria-label={`${count} pending`}>
                    {count}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <button
            type="button"
            className="toggle-btn"
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <span aria-hidden="true">{theme === "dark" ? "☀️" : "🌙"}</span>
          </button>
          <button type="button" className="logout-btn" onClick={() => void handleLogout()}>
            {t(lang, "signOut")}
          </button>
        </div>
      </aside>
      <main className="main" onClick={touchSession}>
        <Outlet />
      </main>
    </div>
  );
}
