import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, shadow, spacing } from "../theme/casa";

interface Props {
  message: string;
  visible: boolean;
  onDismiss: () => void;
  durationMs?: number;
  variant?: "success" | "info";
}

export default function CasaToast({
  message,
  visible,
  onDismiss,
  durationMs = 4000,
  variant = "success",
}: Props) {
  useEffect(() => {
    if (!visible || !message) return;
    const t = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(t);
  }, [visible, message, durationMs, onDismiss]);

  if (!visible || !message) return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Pressable style={[styles.toast, variant === "success" && styles.toastSuccess]} onPress={onDismiss}>
        <Ionicons
          name={variant === "success" ? "checkmark-circle" : "information-circle"}
          size={20}
          color={colors.leaf}
        />
        <Text style={styles.text}>{message}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: 100,
    zIndex: 100,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.lg,
  },
  toastSuccess: {
    borderLeftWidth: 4,
    borderLeftColor: colors.leaf,
  },
  text: { flex: 1, color: colors.inkSoft, fontWeight: "600", fontSize: 14, lineHeight: 20 },
});
