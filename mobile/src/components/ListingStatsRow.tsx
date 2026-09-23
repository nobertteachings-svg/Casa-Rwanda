import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing } from "../theme/casa";

interface StatItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}

interface Props {
  items: StatItem[];
}

export default function ListingStatsRow({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <View style={styles.row}>
      {items.map((item) => (
        <View key={item.label} style={styles.cell}>
          <Ionicons name={item.icon} size={18} color={colors.leaf} />
          <Text style={styles.value}>{item.value}</Text>
          <Text style={styles.label}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  cell: {
    flex: 1,
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderWidth: 1,
    borderColor: colors.line,
  },
  value: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.forest,
    marginTop: 4,
  },
  label: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
    textAlign: "center",
  },
});
