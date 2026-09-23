import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import CasaButton from "./CasaButton";
import { fontFamily } from "../theme/fonts";
import { colors, radii, spacing } from "../theme/casa";
import { useCasaTheme } from "../theme/ThemeContext";

interface Slide {
  title: string;
  body: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface Props {
  visible: boolean;
  slides: Slide[];
  nextLabel: string;
  doneLabel: string;
  skipLabel: string;
  onDone: () => void;
}

export default function OnboardingModal({
  visible,
  slides,
  nextLabel,
  doneLabel,
  skipLabel,
  onDone,
}: Props) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!visible) setIdx(0);
  }, [visible]);

  const last = idx >= slides.length - 1;
  const slide = slides[idx];
  const { colors: themeColors } = useCasaTheme();

  if (!visible || !slide) return null;

  return (
    <Modal visible={visible} animationType="fade">
      <View style={[styles.root, { backgroundColor: themeColors.paper }]}>
        <Pressable style={styles.skip} onPress={onDone}>
          <Text style={styles.skipText}>{skipLabel}</Text>
        </Pressable>
        <View style={styles.center}>
          {slide.icon ? (
            <View style={styles.iconWrap}>
              <Ionicons name={slide.icon} size={64} color={colors.leaf} />
            </View>
          ) : null}
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.body}>{slide.body}</Text>
        </View>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === idx && styles.dotActive]} />
          ))}
        </View>
        <CasaButton
          label={last ? doneLabel : nextLabel}
          onPress={() => (last ? onDone() : setIdx((n) => n + 1))}
          style={styles.cta}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
    padding: spacing.xl,
    justifyContent: "center",
  },
  skip: { position: "absolute", top: 54, right: spacing.lg },
  skipText: { color: colors.leaf, fontWeight: "600", fontFamily: fontFamily.semibold },
  center: { alignItems: "center", paddingHorizontal: spacing.sm },
  iconWrap: {
    width: 128,
    height: 128,
    borderRadius: radii.pill,
    backgroundColor: colors.successBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: spacing.md,
    textAlign: "center",
    fontFamily: fontFamily.bold,
  },
  body: {
    fontSize: 15,
    lineHeight: 23,
    color: colors.muted,
    textAlign: "center",
    fontFamily: fontFamily.regular,
  },
  dots: { flexDirection: "row", justifyContent: "center", gap: 8, marginVertical: spacing.xl },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.lineStrong },
  dotActive: { backgroundColor: colors.leaf, width: 22 },
  cta: { marginTop: spacing.sm },
});
