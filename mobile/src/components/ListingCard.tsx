import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import type { Language } from "../api/client";
import { fontFamily } from "../theme/fonts";
import CachedImage from "./CachedImage";
import { radii, spacing, type ColorTokens } from "../theme/casa";
import { useCasaTheme } from "../theme/ThemeContext";
import { t } from "../i18n/strings";

export interface ListingCardProps {
  type: string;
  location: string;
  rentLabel: string;
  thumbUrl?: string;
  trustTier?: string;
  landlordVerified?: boolean;
  distanceLabel?: string;
  language: Language;
  selected?: boolean;
  statusBadge?: string;
  onPress: () => void;
  style?: ViewStyle;
  compact?: boolean;
  bedroomCount?: number;
  toiletCount?: number;
  monthsUpfront?: number;
  photoCount?: number;
  saved?: boolean;
  onToggleSave?: () => void;
}

export default function ListingCard({
  type,
  location,
  rentLabel,
  thumbUrl,
  trustTier,
  landlordVerified,
  distanceLabel,
  language,
  selected,
  statusBadge,
  onPress,
  style,
  compact,
  bedroomCount,
  toiletCount,
  monthsUpfront,
  photoCount,
  saved,
  onToggleSave,
}: ListingCardProps) {
  const { colors } = useCasaTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const m = t(language);
  const imageHeight = compact ? 148 : 200;
  const verified = Boolean(landlordVerified) || trustTier === "verified_plus";

  const meta = [
    bedroomCount != null ? m.cardBeds(bedroomCount) : null,
    toiletCount != null ? m.cardBaths(toiletCount) : null,
    monthsUpfront && monthsUpfront > 0 ? m.cardMonths(monthsUpfront) : null,
  ].filter(Boolean);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && styles.cardPressed,
        style,
      ]}
      onPress={onPress}
      android_ripple={{ color: "rgba(27, 142, 62, 0.12)" }}
      accessibilityRole="button"
      accessibilityLabel={`${type}, ${location}, ${rentLabel}`}
    >
      <View>
        {thumbUrl ? (
          <CachedImage uri={thumbUrl} style={[styles.thumb, { height: imageHeight }]} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbPh, { height: imageHeight }]}>
            <Ionicons name="home-outline" size={32} color={colors.leaf} />
          </View>
        )}
        <View style={styles.priceBadge}>
          <Text style={styles.priceBadgeText}>{rentLabel}</Text>
        </View>
        {verified ? (
          <View style={styles.verifiedMark} accessibilityLabel={m.verifyBadgeVerified}>
            <Ionicons name="checkmark-circle" size={18} color={colors.leaf} />
          </View>
        ) : null}
        {onToggleSave ? (
          <Pressable
            style={styles.heart}
            onPress={(e) => {
              e.stopPropagation?.();
              onToggleSave();
            }}
            hitSlop={8}
            accessibilityLabel={saved ? m.detailSaved : m.detailSave}
          >
            <Ionicons name={saved ? "heart" : "heart-outline"} size={20} color={saved ? "#EF4444" : "#ffffff"} />
          </Pressable>
        ) : null}
        {statusBadge ? (
          <View style={styles.statusOverlay}>
            <Text style={styles.statusOverlayText}>{statusBadge}</Text>
          </View>
        ) : null}
        {photoCount && photoCount > 1 ? (
          <View style={styles.photoCount}>
            <Ionicons name="images-outline" size={12} color="#ffffff" />
            <Text style={styles.photoCountText}>{photoCount}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {location}
        </Text>
        <Text style={styles.type} numberOfLines={1}>
          {type}
        </Text>
        {meta.length > 0 ? (
          <Text style={styles.meta} numberOfLines={1}>
            {meta.join(" · ")}
          </Text>
        ) : null}
        {distanceLabel ? <Text style={styles.dist}>{distanceLabel}</Text> : null}
      </View>
    </Pressable>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.paper,
      borderRadius: radii.lg,
      overflow: "hidden",
    },
    cardSelected: {
      borderWidth: 2,
      borderColor: c.leaf,
    },
    cardPressed: { opacity: 0.94, transform: [{ scale: 0.99 }] },
    thumb: { width: "100%", backgroundColor: c.paper2 },
    thumbPh: { alignItems: "center", justifyContent: "center" },
    priceBadge: {
      position: "absolute",
      bottom: 12,
      left: 12,
      backgroundColor: "rgba(15, 20, 25, 0.72)",
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      maxWidth: "78%",
    },
    priceBadgeText: {
      color: "#ffffff",
      fontSize: 14,
      fontWeight: "700",
      fontFamily: fontFamily.bold,
    },
    verifiedMark: {
      position: "absolute",
      top: 12,
      left: 12,
      backgroundColor: "rgba(255,255,255,0.92)",
      borderRadius: 12,
      padding: 2,
    },
    heart: {
      position: "absolute",
      top: 10,
      right: 10,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(15, 20, 25, 0.4)",
      alignItems: "center",
      justifyContent: "center",
    },
    statusOverlay: {
      position: "absolute",
      top: 12,
      left: 44,
      backgroundColor: c.paper,
      borderRadius: radii.sm,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    statusOverlayText: {
      color: c.leaf,
      fontSize: 12,
      fontWeight: "600",
      fontFamily: fontFamily.semibold,
    },
    photoCount: {
      position: "absolute",
      bottom: 12,
      right: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "rgba(15, 20, 25, 0.55)",
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    photoCountText: { color: "#ffffff", fontSize: 11, fontWeight: "700", fontFamily: fontFamily.bold },
    body: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    title: {
      fontSize: 16,
      fontWeight: "600",
      color: c.ink,
      letterSpacing: -0.2,
      fontFamily: fontFamily.semibold,
    },
    type: {
      fontSize: 13,
      color: c.muted,
      marginTop: 2,
      fontFamily: fontFamily.regular,
    },
    meta: {
      fontSize: 13,
      color: c.inkSoft,
      marginTop: 6,
      fontFamily: fontFamily.medium,
    },
    dist: {
      fontSize: 12,
      color: c.mutedLight,
      marginTop: 4,
      fontFamily: fontFamily.medium,
    },
  });
}
