import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { radii, spacing, type ColorTokens } from "../theme/casa";
import { useCasaTheme } from "../theme/ThemeContext";

export interface GridOption {
  id: string;
  label: string;
  description?: string;
}

interface Props {
  options: GridOption[];
  onSelect: (id: string, label: string) => void;
  disabled?: boolean;
  columns?: 1 | 2;
  selectedId?: string;
}

export default function OptionGrid({ options, onSelect, disabled, columns = 1, selectedId }: Props) {
  const { colors } = useCasaTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.wrap}>
      {options.map((opt) => {
        const on = selectedId === opt.id;
        return (
          <Pressable
            key={opt.id}
            style={({ pressed }) => [
              styles.btn,
              columns === 2 && styles.btnHalf,
              on && styles.btnOn,
              disabled && styles.btnDisabled,
              pressed && !disabled && !on && styles.btnPressed,
            ]}
            disabled={disabled}
            onPress={() => onSelect(opt.id, opt.label)}
            accessibilityState={{ selected: on }}
          >
            <View style={styles.btnRow}>
              <View style={styles.btnText}>
                <Text style={[styles.btnTitle, on && styles.btnTitleOn]}>{opt.label}</Text>
                {opt.description ? (
                  <Text style={[styles.btnDesc, on && styles.btnDescOn]}>{opt.description}</Text>
                ) : null}
              </View>
              {on ? <Ionicons name="checkmark-circle" size={22} color={colors.onDark} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ChipRow({
  items,
  onSelect,
  disabled,
  selectedId,
}: {
  items: GridOption[];
  onSelect: (id: string, label: string) => void;
  disabled?: boolean;
  selectedId?: string;
}) {
  const { colors } = useCasaTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {items.map((opt) => {
        const on = selectedId === opt.id;
        return (
          <Pressable
            key={opt.id}
            style={[styles.chip, on && styles.chipOn, disabled && styles.btnDisabled]}
            disabled={disabled}
            onPress={() => onSelect(opt.id, opt.label)}
            accessibilityState={{ selected: on }}
          >
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    wrap: { gap: spacing.sm },
    btn: {
      backgroundColor: c.paper,
      borderRadius: radii.lg,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
      borderWidth: 2,
      borderColor: c.lineStrong,
    },
    btnOn: {
      backgroundColor: c.leaf,
      borderColor: c.leaf,
    },
    btnHalf: { width: "48%" },
    btnDisabled: { opacity: 0.5 },
    btnPressed: { backgroundColor: c.successBg, borderColor: c.leaf },
    btnRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    btnText: { flex: 1 },
    btnTitle: { fontSize: 16, fontWeight: "600", color: c.ink },
    btnTitleOn: { color: c.onDark },
    btnDesc: { fontSize: 13, color: c.muted, marginTop: 4, lineHeight: 18 },
    btnDescOn: { color: c.onDarkMuted },
    chips: { gap: spacing.sm, paddingVertical: spacing.xs },
    chip: {
      backgroundColor: c.paper,
      borderRadius: radii.pill,
      borderWidth: 2,
      borderColor: c.lineStrong,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    chipOn: {
      backgroundColor: c.leaf,
      borderColor: c.leaf,
    },
    chipText: { fontWeight: "700", color: c.inkSoft, fontSize: 13 },
    chipTextOn: { color: c.onDark },
  });
}
