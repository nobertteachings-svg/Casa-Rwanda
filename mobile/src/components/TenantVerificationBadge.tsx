import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import type { Language } from "../api/client";
import { t } from "../i18n/strings";
import { colors, radii } from "../theme/casa";

interface Props {
  verified: boolean;
  language: Language;
  style?: StyleProp<ViewStyle>;
  onVerifyPress?: () => void;
}

export default function TenantVerificationBadge({ verified, language, style, onVerifyPress }: Props) {
  const m = t(language);
  const inner = (
    <View style={[styles.badge, verified ? styles.verified : styles.unverified, style]}>
      <Text style={[styles.text, verified ? styles.textVerified : styles.textUnverified]}>
        {verified ? m.tenantVerifiedBadge : m.tenantVerifyPrompt}
      </Text>
    </View>
  );
  if (!verified && onVerifyPress) {
    return (
      <Pressable onPress={onVerifyPress} accessibilityRole="button">
        {inner}
      </Pressable>
    );
  }
  return inner;
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.sm,
  },
  verified: { backgroundColor: colors.successBg },
  unverified: { backgroundColor: "rgba(255,255,255,0.15)" },
  text: { fontSize: 12, fontWeight: "800" },
  textVerified: { color: colors.leaf },
  textUnverified: { color: colors.white },
});
