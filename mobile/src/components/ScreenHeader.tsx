import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { fontFamily } from "../theme/fonts";
import { spacing } from "../theme/casa";
import { screenInsets } from "../theme/insets";
import { useCasaTheme } from "../theme/ThemeContext";

interface Props {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  right?: ReactNode;
  children?: ReactNode;
  style?: ViewStyle;
  variant?: "brand" | "quiet";
}

export default function ScreenHeader({
  title,
  subtitle,
  eyebrow,
  right,
  children,
  style,
  variant = "brand",
}: Props) {
  const { gradient, colors } = useCasaTheme();
  const top = screenInsets().top;

  if (variant === "quiet") {
    return (
      <View style={[styles.quietWrap, { paddingTop: top, backgroundColor: colors.paper, borderBottomColor: colors.line }, style]}>
        <View style={styles.quietRow}>
          <View style={styles.quietText}>
            <Text style={[styles.quietTitle, { color: colors.ink }]} accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? <Text style={[styles.quietSub, { color: colors.muted }]}>{subtitle}</Text> : null}
          </View>
          {right}
        </View>
        {children}
      </View>
    );
  }

  return (
    <LinearGradient colors={[...gradient.header]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.wrap, { paddingTop: top }, style]}>
      <View style={styles.safe}>
        <View style={styles.row}>
          <View style={styles.textCol}>
            {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {right ? <View style={styles.right}>{right}</View> : null}
        </View>
        {children}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingBottom: spacing.md,
  },
  safe: {
    paddingHorizontal: spacing.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    minHeight: 44,
  },
  textCol: { flex: 1, alignItems: "flex-start" },
  right: { position: "absolute", right: 0, top: 4 },
  eyebrow: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.78)",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
    fontFamily: fontFamily.semibold,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#ffffff",
    fontFamily: fontFamily.semibold,
  },
  subtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.78)",
    marginTop: 4,
    lineHeight: 18,
    fontFamily: fontFamily.regular,
  },
  quietWrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  quietRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  quietText: { flex: 1 },
  quietTitle: {
    fontSize: 22,
    fontWeight: "600",
    fontFamily: fontFamily.semibold,
  },
  quietSub: {
    fontSize: 13,
    marginTop: 2,
    fontFamily: fontFamily.regular,
  },
});
