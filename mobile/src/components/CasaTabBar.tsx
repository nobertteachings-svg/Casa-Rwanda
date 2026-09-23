import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { hapticLight } from "../utils/haptics";
import { fontFamily } from "../theme/fonts";
import { spacing, type ColorTokens } from "../theme/casa";
import { screenInsets } from "../theme/insets";
import { useCasaTheme } from "../theme/ThemeContext";

export interface TabItem {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive?: keyof typeof Ionicons.glyphMap;
  badge?: number;
}

interface Props {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
}

export default function CasaTabBar({ tabs, active, onChange }: Props) {
  const { colors } = useCasaTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const insets = screenInsets();

  return (
    <View style={[styles.safe, { paddingBottom: insets.bottom }]}>
      <View style={styles.bar}>
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          const iconName = isActive && tab.iconActive ? tab.iconActive : tab.icon;
          const showBadge = (tab.badge ?? 0) > 0;
          const badgeCount = tab.badge ?? 0;
          const badgeLabel = badgeCount > 9 ? "9+" : String(badgeCount);
          return (
            <Pressable
              key={tab.id}
              style={styles.tab}
              onPress={() => {
                if (tab.id !== active) hapticLight();
                onChange(tab.id);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={showBadge ? `${tab.label}, ${badgeCount} saved` : tab.label}
            >
              <View style={styles.iconWrap}>
                <Ionicons name={iconName} size={24} color={isActive ? colors.leaf : colors.muted} />
                {showBadge ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badgeLabel}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.label, isActive && styles.labelActive]} numberOfLines={1}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    safe: {
      backgroundColor: c.paper,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.line,
    },
    bar: {
      flexDirection: "row",
      paddingTop: spacing.sm,
      paddingBottom: 4,
      paddingHorizontal: spacing.xs,
    },
    tab: {
      flex: 1,
      alignItems: "center",
      paddingVertical: spacing.xs,
    },
    iconWrap: {
      width: 32,
      height: 28,
      alignItems: "center",
      justifyContent: "center",
    },
    badge: {
      position: "absolute",
      top: -4,
      right: -8,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: c.danger,
      borderWidth: 1.5,
      borderColor: c.paper,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 3,
    },
    badgeText: {
      fontSize: 9,
      fontWeight: "700",
      color: "#ffffff",
      fontFamily: fontFamily.bold,
    },
    label: {
      fontSize: 11,
      color: c.muted,
      marginTop: 2,
      fontFamily: fontFamily.regular,
    },
    labelActive: {
      color: c.leaf,
      fontWeight: "600",
      fontFamily: fontFamily.semibold,
    },
  });
}
