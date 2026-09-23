import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { colors, radii, shadow, spacing } from "../theme/casa";

interface Props {
  title: string;
  body: string;
  variant?: "ai" | "basic";
  bestFitLabel?: string;
}

export default function CompareResultCard({ title, body, variant = "basic", bestFitLabel }: Props) {
  const isAi = variant === "ai";

  return (
    <View style={[styles.card, isAi && styles.cardAi]}>
      <View style={styles.header}>
        <Ionicons
          name={isAi ? "sparkles" : "git-compare-outline"}
          size={18}
          color={isAi ? colors.gold : colors.leaf}
        />
        <Text style={[styles.title, isAi && styles.titleAi]}>{title}</Text>
      </View>
      {isAi && bestFitLabel ? (
        <View style={styles.bestFitBadge}>
          <Text style={styles.bestFitText}>{bestFitLabel}</Text>
        </View>
      ) : null}
      <Text style={[styles.body, isAi && styles.bodyAi]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.lg,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.sm,
  },
  cardAi: {
    borderColor: colors.forest,
    backgroundColor: colors.forestDeep,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.leaf,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  titleAi: { color: colors.gold },
  bestFitBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.gold,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    marginBottom: spacing.sm,
  },
  bestFitText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.forestDeep,
    textTransform: "uppercase",
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.inkSoft,
  },
  bodyAi: { color: colors.onDarkMuted },
});
