import { StyleSheet, Text, View } from "react-native";
import type { Language } from "../api/client";
import { t } from "../i18n/strings";
import { fontFamily } from "../theme/fonts";
import { colors, radii } from "../theme/casa";

interface Props {
  trustTier?: string;
  landlordVerified?: boolean;
  language: Language;
  compact?: boolean;
}

export default function TrustBadge({ trustTier, landlordVerified, language, compact }: Props) {
  const m = t(language);
  const verifiedPlus = trustTier === "verified_plus";
  if (!verifiedPlus && !landlordVerified) return null;

  return (
    <View style={styles.row}>
      {verifiedPlus ? (
        <View style={[styles.badge, styles.plus, compact && styles.compact]}>
          <Text style={[styles.plusText, compact && styles.compactText]} accessibilityLabel={m.trustVerifiedPlus}>
            ✦ {m.trustVerifiedPlus}
          </Text>
        </View>
      ) : null}
      {landlordVerified ? (
        <View style={[styles.badge, styles.verified, compact && styles.compact]}>
          <Text style={[styles.verifiedText, compact && styles.compactText]} accessibilityLabel={m.verifyBadgeVerified}>
            ✓ {m.verifyBadgeVerified}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  compact: { paddingHorizontal: 6, paddingVertical: 2 },
  plus: { backgroundColor: colors.successBg, borderWidth: 1, borderColor: colors.leafBright },
  plusText: { fontSize: 12, fontWeight: "600", color: colors.leaf, fontFamily: fontFamily.semibold },
  verified: { backgroundColor: colors.accentSoft },
  verifiedText: { fontSize: 12, fontWeight: "600", color: colors.leaf, fontFamily: fontFamily.semibold },
  compactText: { fontSize: 10 },
});
