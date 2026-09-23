import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import type { Language } from "../api/client";
import { t } from "../i18n/strings";
import { radii, type ColorTokens } from "../theme/casa";
import { useCasaTheme } from "../theme/ThemeContext";

interface Props {
  verified: boolean;
  language: Language;
  compact?: boolean;
  /** When false, hide the unverified warning (e.g. loading). Default true. */
  showUnverified?: boolean;
  style?: StyleProp<ViewStyle>;
  onVerifyPress?: () => void;
}

export default function LandlordVerificationBadge({
  verified,
  language,
  compact = false,
  showUnverified = true,
  style,
  onVerifyPress,
}: Props) {
  const m = t(language);
  const { colors } = useCasaTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (verified) {
    return (
      <View style={[styles.badge, styles.verified, compact && styles.compact, style]}>
        <Text style={[styles.text, styles.verifiedText, compact && styles.compactText]}>
          ✓ {m.verifyBadgeVerified}
        </Text>
      </View>
    );
  }

  if (!showUnverified) return null;

  const content = (
    <View style={[styles.badge, styles.unverified, compact && styles.compact, style]}>
      <Text style={[styles.text, styles.unverifiedText, compact && styles.compactText]}>
        ⚠ {m.verifyBadgeUnverified}
      </Text>
    </View>
  );

  if (onVerifyPress) {
    return (
      <Pressable onPress={onVerifyPress} accessibilityRole="button">
        {content}
      </Pressable>
    );
  }

  return content;
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    badge: {
      alignSelf: "flex-start",
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginTop: 6,
    },
    compact: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      marginTop: 4,
      borderRadius: 6,
    },
    verified: {
      backgroundColor: c.successBg,
      borderWidth: 1,
      borderColor: c.leaf,
    },
    unverified: {
      backgroundColor: "rgba(255,244,224,0.95)",
      borderWidth: 1,
      borderColor: c.gold,
    },
    text: { fontWeight: "800", fontSize: 13 },
    compactText: { fontSize: 11 },
    verifiedText: { color: c.leaf },
    unverifiedText: { color: "#8a5a00" },
  });
}
