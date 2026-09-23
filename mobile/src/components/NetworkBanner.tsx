import { StyleSheet, Text, View } from "react-native";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import type { Language } from "../api/client";
import { t } from "../i18n/strings";
import { colors, spacing } from "../theme/casa";

interface Props {
  language: Language;
}

export default function NetworkBanner({ language }: Props) {
  const online = useNetworkStatus();
  const m = t(language);
  if (online) return null;
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.text}>{m.offlineBanner}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.danger,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  text: { color: colors.white, textAlign: "center", fontWeight: "700", fontSize: 13 },
});
