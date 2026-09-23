import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import CasaButton from "./CasaButton";
import { fontFamily } from "../theme/fonts";
import { radii, spacing, type ColorTokens } from "../theme/casa";
import { useCasaTheme } from "../theme/ThemeContext";

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon, title, subtitle, actionLabel, onAction }: Props) {
  const { colors } = useCasaTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={40} color={colors.leaf} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <CasaButton label={actionLabel} onPress={onAction} style={styles.btn} />
      ) : null}
    </View>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: radii.pill,
    backgroundColor: c.successBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: c.ink,
    textAlign: "center",
    lineHeight: 26,
    fontFamily: fontFamily.bold,
  },
  subtitle: {
    fontSize: 14,
    color: c.muted,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 21,
    maxWidth: 280,
    fontFamily: fontFamily.regular,
  },
  btn: { marginTop: spacing.lg, alignSelf: "stretch", maxWidth: 280 },
});
}
