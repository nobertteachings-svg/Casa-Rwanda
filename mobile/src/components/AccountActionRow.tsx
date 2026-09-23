import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fontFamily } from "../theme/fonts";
import { radii, spacing, type ColorTokens } from "../theme/casa";
import { useCasaTheme } from "../theme/ThemeContext";

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  accent?: boolean;
}

export default function AccountActionRow({ icon, label, onPress, accent }: Props) {
  const { colors } = useCasaTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable
      style={({ pressed }) => [styles.row, accent && styles.rowAccent, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={[styles.iconWrap, accent && styles.iconWrapAccent]}>
        <Ionicons name={icon} size={20} color={accent ? colors.onDark : colors.leaf} />
      </View>
      <Text style={[styles.label, accent && styles.labelAccent]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={accent ? colors.onDarkMuted : colors.mutedLight} />
    </Pressable>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: c.paper2,
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: spacing.sm,
  },
  rowAccent: {
    backgroundColor: c.leaf,
  },
  pressed: { opacity: 0.92 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: c.successBg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  iconWrapAccent: { backgroundColor: "rgba(255,255,255,0.18)" },
  label: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: c.ink,
    fontFamily: fontFamily.semibold,
  },
  labelAccent: { color: c.onDark },
});
}
