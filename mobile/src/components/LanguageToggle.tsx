import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Language } from "../api/client";
import { fontFamily } from "../theme/fonts";
import { radii, type ColorTokens } from "../theme/casa";
import { useCasaTheme } from "../theme/ThemeContext";

interface Props {
  language: Language;
  onChange: (lang: Language) => void;
  compact?: boolean;
  /** "dark" = on green header; "light" = on card background */
  variant?: "dark" | "light";
}

export default function LanguageToggle({
  language,
  onChange,
  compact,
  variant = "dark",
}: Props) {
  const { colors } = useCasaTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const light = variant === "light";
  return (
    <View style={[styles.row, compact && styles.compact]}>
      <Pressable
        style={[styles.btn, light && styles.btnLight, language === "en" && styles.btnActive]}
        onPress={() => onChange("en")}
      >
        <Text
          style={[
            styles.text,
            light && styles.textLight,
            language === "en" && styles.textActive,
          ]}
        >
          EN
        </Text>
      </Pressable>
      <Pressable
        style={[styles.btn, light && styles.btnLight, language === "fr" && styles.btnActive]}
        onPress={() => onChange("fr")}
      >
        <Text
          style={[
            styles.text,
            light && styles.textLight,
            language === "fr" && styles.textActive,
          ]}
        >
          FR
        </Text>
      </Pressable>
    </View>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    row: { flexDirection: "row", gap: 6 },
    compact: { marginBottom: 0 },
    btn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: c.onDarkSubtle,
    },
    btnLight: {
      borderColor: c.lineStrong,
      backgroundColor: c.paper2,
    },
    btnActive: { backgroundColor: c.leaf, borderColor: c.leaf },
    text: {
      color: c.onDarkMuted,
      fontWeight: "600",
      fontSize: 13,
      fontFamily: fontFamily.semibold,
    },
    textLight: { color: c.muted },
    textActive: { color: c.onDark },
  });
}
