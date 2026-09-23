import { useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from "react-native";
import { fontFamily } from "../theme/fonts";
import { radii, type ColorTokens } from "../theme/casa";
import { useCasaTheme } from "../theme/ThemeContext";

interface Props {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "wa";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export default function CasaButton({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
}: Props) {
  const { colors } = useCasaTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const busy = disabled || loading;
  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        variant === "primary" && styles.primary,
        variant === "secondary" && styles.secondary,
        variant === "ghost" && styles.ghost,
        variant === "wa" && styles.wa,
        pressed && !busy && styles.pressed,
        busy && styles.disabled,
        style,
      ]}
      disabled={busy}
      onPress={onPress}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" || variant === "ghost" ? colors.leaf : colors.onDark} />
      ) : (
        <Text
          style={[
            styles.text,
            variant === "secondary" && styles.textSecondary,
            variant === "ghost" && styles.textGhost,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    base: {
      borderRadius: radii.md,
      paddingVertical: 14,
      paddingHorizontal: 24,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 48,
    },
    primary: { backgroundColor: c.leaf },
    secondary: {
      backgroundColor: c.paper,
      borderWidth: 1.5,
      borderColor: c.leaf,
    },
    ghost: { backgroundColor: "transparent" },
    wa: { backgroundColor: c.wa },
    pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
    disabled: { opacity: 0.55 },
    text: {
      color: c.onDark,
      fontSize: 16,
      fontWeight: "600",
      fontFamily: fontFamily.semibold,
    },
    textSecondary: { color: c.leaf },
    textGhost: { color: c.leaf, fontWeight: "600" },
  });
}
