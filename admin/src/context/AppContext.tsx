import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "../api/client";
import type { Lang } from "../i18n/strings";
import type { NavBadges } from "../types";

const THEME_KEY = "casa_admin_theme";
const SESSION_EXP_STORAGE = "casa_admin_session_exp";
const SESSION_MS = 8 * 60 * 60 * 1000;

interface AppContextValue {
  theme: "light" | "dark";
  lang: Lang;
  badges: NavBadges;
  sidebarOpen: boolean;
  setTheme: (t: "light" | "dark") => void;
  setLang: (l: Lang) => void;
  setSidebarOpen: (o: boolean) => void;
  refreshBadges: () => Promise<void>;
  touchSession: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<"light" | "dark">(
    () => (localStorage.getItem(THEME_KEY) as "light" | "dark") || "light"
  );
  const [lang] = useState<Lang>("en");
  const [badges, setBadges] = useState<NavBadges>({
    moderation: 0,
    verifications: 0,
    payments_disputed: 0,
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const setTheme = (t: "light" | "dark") => {
    setThemeState(t);
    localStorage.setItem(THEME_KEY, t);
    document.documentElement.dataset.theme = t;
  };

  const setLang = (_l: Lang) => {
    /* Casa Rwanda is English-only */
  };

  const refreshBadges = useCallback(async () => {
    try {
      const b = await api.getBadges();
      setBadges(b);
    } catch {
      /* ignore */
    }
  }, []);

  const touchSession = useCallback(() => {
    const exp = sessionStorage.getItem(SESSION_EXP_STORAGE);
    if (exp) {
      sessionStorage.setItem(SESSION_EXP_STORAGE, String(Date.now() + SESSION_MS));
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    refreshBadges();
    const id = setInterval(refreshBadges, 60_000);
    return () => clearInterval(id);
  }, [refreshBadges, theme]);

  useEffect(() => {
    const exp = sessionStorage.getItem(SESSION_EXP_STORAGE);
    if (exp && Date.now() > parseInt(exp, 10)) {
      sessionStorage.removeItem("casa_admin_session");
      sessionStorage.removeItem(SESSION_EXP_STORAGE);
    }
  }, []);

  const value = useMemo(
    () => ({
      theme,
      lang,
      badges,
      sidebarOpen,
      setTheme,
      setLang,
      setSidebarOpen,
      refreshBadges,
      touchSession,
    }),
    [theme, lang, badges, sidebarOpen, refreshBadges, touchSession]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp outside provider");
  return ctx;
}
