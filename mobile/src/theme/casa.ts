/** Casa visual tokens — aligned with the Flutter Casa mobile design. */

import { fontFamily } from "./fonts";

export { fontFamily };

export type ColorTokens = {
  ink: string;
  inkSoft: string;
  muted: string;
  mutedLight: string;
  line: string;
  lineStrong: string;
  paper: string;
  paper2: string;
  forest: string;
  forestDeep: string;
  forestMid: string;
  leaf: string;
  leafBright: string;
  leafGlow: string;
  wa: string;
  gold: string;
  white: string;
  danger: string;
  dangerBg: string;
  successBg: string;
  whatsappLight: string;
  onDark: string;
  onDarkMuted: string;
  onDarkSubtle: string;
  accentSoft: string;
  info: string;
};

export const lightColors: ColorTokens = {
  ink: "#0F1419",
  inkSoft: "#1a1d24",
  muted: "#64748B",
  mutedLight: "#94A3B8",
  line: "rgba(15, 20, 25, 0.08)",
  lineStrong: "rgba(15, 20, 25, 0.16)",
  paper: "#ffffff",
  paper2: "#F8F9FA",
  forest: "#0F1419",
  forestDeep: "#0F1419",
  forestMid: "#1B8E3E",
  leaf: "#1B8E3E",
  leafBright: "#1FA84A",
  leafGlow: "rgba(27, 142, 62, 0.12)",
  wa: "#128c7e",
  gold: "#F59E0B",
  white: "#ffffff",
  danger: "#EF4444",
  dangerBg: "#FEF2F2",
  successBg: "rgba(27, 142, 62, 0.10)",
  whatsappLight: "rgba(18, 140, 126, 0.12)",
  onDark: "#ffffff",
  onDarkMuted: "rgba(255, 255, 255, 0.78)",
  onDarkSubtle: "rgba(255, 255, 255, 0.45)",
  accentSoft: "#D1FAE5",
  info: "#06B6D4",
};

export const darkColors: ColorTokens = {
  ink: "#E2E8F0",
  inkSoft: "#E2E8F0",
  muted: "#94A3B8",
  mutedLight: "#64748B",
  line: "rgba(226, 232, 240, 0.08)",
  lineStrong: "rgba(226, 232, 240, 0.16)",
  paper: "#1a1d24",
  paper2: "#0F1419",
  forest: "#E2E8F0",
  forestDeep: "#0F1419",
  forestMid: "#1FA84A",
  leaf: "#1FA84A",
  leafBright: "#34D399",
  leafGlow: "rgba(31, 168, 74, 0.18)",
  wa: "#128c7e",
  gold: "#F59E0B",
  white: "#1a1d24",
  danger: "#F87171",
  dangerBg: "rgba(239, 68, 68, 0.16)",
  successBg: "rgba(31, 168, 74, 0.16)",
  whatsappLight: "rgba(18, 140, 126, 0.18)",
  onDark: "#ffffff",
  onDarkMuted: "rgba(255, 255, 255, 0.78)",
  onDarkSubtle: "rgba(255, 255, 255, 0.45)",
  accentSoft: "rgba(31, 168, 74, 0.22)",
  info: "#22D3EE",
};

/** Light palette — prefer `useCasaTheme().colors` so dark mode applies. */
export const colors = lightColors;

export function colorsFor(scheme: "light" | "dark"): ColorTokens {
  return scheme === "dark" ? darkColors : lightColors;
}

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const type = {
  display: {
    fontSize: 28,
    fontWeight: "700" as const,
    letterSpacing: -0.5,
    fontFamily: fontFamily.bold,
  },
  title: {
    fontSize: 22,
    fontWeight: "600" as const,
    letterSpacing: -0.3,
    fontFamily: fontFamily.semibold,
  },
  headline: {
    fontSize: 17,
    fontWeight: "600" as const,
    fontFamily: fontFamily.semibold,
  },
  body: {
    fontSize: 15,
    fontWeight: "400" as const,
    lineHeight: 22,
    fontFamily: fontFamily.regular,
  },
  label: {
    fontSize: 13,
    fontWeight: "600" as const,
    letterSpacing: 0.2,
    fontFamily: fontFamily.semibold,
  },
  caption: {
    fontSize: 12,
    fontWeight: "500" as const,
    fontFamily: fontFamily.medium,
  },
  micro: {
    fontSize: 11,
    fontWeight: "600" as const,
    letterSpacing: 0.3,
    fontFamily: fontFamily.semibold,
  },
} as const;

export const shadow = {
  sm: {
    shadowColor: "#0F1419",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: "#0F1419",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  lg: {
    shadowColor: "#0F1419",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 6,
  },
  tabBar: {
    shadowColor: "#0F1419",
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
} as const;

export const gradient = {
  header: [lightColors.leaf, lightColors.leaf] as const,
  hero: [lightColors.leaf, lightColors.leafBright] as const,
  accent: [lightColors.leaf, lightColors.leafBright] as const,
};

export function gradientFor(c: ColorTokens) {
  return {
    header: [c.leaf, c.leaf] as const,
    hero: [c.leaf, c.leafBright] as const,
    accent: [c.leaf, c.leafBright] as const,
  };
}
