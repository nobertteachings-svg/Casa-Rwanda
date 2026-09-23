import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Appearance, StyleSheet } from "react-native";
import {
  colorsFor,
  fontFamily,
  radii,
  shadow,
  spacing,
  type,
  type ColorTokens,
  gradientFor,
} from "./casa";
import { getThemeMode, setThemeMode, type ThemeMode } from "../storage/app-settings";

export type { ThemeMode };

type CasaThemeValue = {
  mode: ThemeMode;
  scheme: "light" | "dark";
  colors: ColorTokens;
  gradient: ReturnType<typeof gradientFor>;
  ui: ReturnType<typeof makeUi>;
  setMode: (mode: ThemeMode) => void;
};

const CasaThemeContext = createContext<CasaThemeValue | null>(null);

function resolveScheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "light" || mode === "dark") return mode;
  return Appearance.getColorScheme() === "dark" ? "dark" : "light";
}

export function makeUi(c: ColorTokens) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.paper2,
    },
    screenContent: {
      padding: spacing.lg,
      paddingBottom: 120,
    },
    card: {
      backgroundColor: c.paper,
      borderRadius: radii.lg,
      ...shadow.sm,
    },
    cardPad: {
      padding: spacing.lg,
    },
    input: {
      backgroundColor: c.paper,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.lineStrong,
      paddingHorizontal: spacing.lg,
      paddingVertical: 14,
      fontSize: 16,
      color: c.ink,
      fontFamily: fontFamily.regular,
    },
    btnPrimary: {
      backgroundColor: c.leaf,
      borderRadius: radii.md,
      paddingVertical: 14,
      paddingHorizontal: spacing.xl,
      alignItems: "center",
      justifyContent: "center",
    },
    btnPrimaryText: {
      color: c.onDark,
      fontSize: 16,
      fontWeight: "600",
      fontFamily: fontFamily.semibold,
    },
    btnSecondary: {
      backgroundColor: c.paper,
      borderRadius: radii.md,
      borderWidth: 1.5,
      borderColor: c.leaf,
      paddingVertical: 14,
      paddingHorizontal: spacing.xl,
      alignItems: "center",
    },
    btnSecondaryText: {
      color: c.leaf,
      fontSize: 15,
      fontWeight: "600",
      fontFamily: fontFamily.semibold,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radii.pill,
      backgroundColor: c.paper,
      borderWidth: 1,
      borderColor: c.lineStrong,
    },
    chipActive: {
      backgroundColor: c.leaf,
      borderColor: c.leaf,
    },
    chipText: {
      fontSize: 13,
      fontWeight: "600",
      color: c.muted,
      fontFamily: fontFamily.semibold,
    },
    chipTextActive: {
      color: c.onDark,
    },
    sectionTitle: {
      ...type.label,
      color: c.muted,
      textTransform: "uppercase",
      marginBottom: spacing.sm,
      marginTop: spacing.lg,
    },
    error: {
      color: c.danger,
      fontSize: 14,
      lineHeight: 20,
      fontFamily: fontFamily.medium,
    },
    toast: {
      backgroundColor: c.successBg,
      borderLeftWidth: 3,
      borderLeftColor: c.leaf,
      padding: spacing.md,
      marginHorizontal: spacing.lg,
      marginVertical: spacing.sm,
      borderRadius: radii.md,
    },
    toastText: {
      color: c.inkSoft,
      fontWeight: "600",
      fontSize: 14,
      fontFamily: fontFamily.semibold,
    },
  });
}

export function CasaThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [scheme, setScheme] = useState<"light" | "dark">(resolveScheme("system"));

  useEffect(() => {
    void getThemeMode().then((saved) => {
      setModeState(saved);
      setScheme(resolveScheme(saved));
    });
  }, []);

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setModeState((current) => {
        if (current === "system") {
          setScheme(colorScheme === "dark" ? "dark" : "light");
        }
        return current;
      });
    });
    return () => sub.remove();
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    setScheme(resolveScheme(next));
    void setThemeMode(next);
  }, []);

  const colors = useMemo(() => colorsFor(scheme), [scheme]);
  const gradient = useMemo(() => gradientFor(colors), [colors]);
  const ui = useMemo(() => makeUi(colors), [colors]);

  const value = useMemo(
    () => ({ mode, scheme, colors, gradient, ui, setMode }),
    [mode, scheme, colors, gradient, ui, setMode]
  );

  return <CasaThemeContext.Provider value={value}>{children}</CasaThemeContext.Provider>;
}

export function useCasaTheme(): CasaThemeValue {
  const ctx = useContext(CasaThemeContext);
  if (!ctx) {
    const fallback = colorsFor("light");
    return {
      mode: "light",
      scheme: "light",
      colors: fallback,
      gradient: gradientFor(fallback),
      ui: makeUi(fallback),
      setMode: () => undefined,
    };
  }
  return ctx;
}
