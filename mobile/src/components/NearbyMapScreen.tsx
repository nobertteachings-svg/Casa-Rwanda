import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";
import type { Language, SearchListing } from "../api/client";
import { t } from "../i18n/strings";
import { openDirections } from "../utils/contact";
import { hapticLight } from "../utils/haptics";
import { useCasaTheme } from "../theme/ThemeContext";
import { radii, spacing, type ColorTokens } from "../theme/casa";
import { fontFamily } from "../theme/fonts";
import { screenInsets } from "../theme/insets";
import CachedImage from "./CachedImage";
import ScreenHeader from "./ScreenHeader";

interface Props {
  visible?: boolean;
  embedded?: boolean;
  listings: SearchListing[];
  language: Language;
  userCoords: { lat: number; lng: number } | null;
  selectedId: string | null;
  onSelect: (houseId: string) => void;
  onOpenListing: (houseId: string) => void;
  onClose?: () => void;
}

function rentPin(n: number): string {
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(n);
}

export default function NearbyMapScreen({
  visible = true,
  embedded = false,
  listings,
  language,
  userCoords,
  selectedId,
  onSelect,
  onOpenListing,
  onClose,
}: Props) {
  const m = t(language);
  const { colors } = useCasaTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const mapRef = useRef<MapView>(null);
  const [pickedId, setPickedId] = useState<string | null>(selectedId);

  const activeId = pickedId ?? selectedId ?? listings[0]?.houseId ?? null;
  const active = listings.find((x) => x.houseId === activeId) ?? listings[0];

  useEffect(() => {
    setPickedId(selectedId);
  }, [selectedId, listings]);

  const region: Region = useMemo(() => {
    const lat = active?.latitude ?? userCoords?.lat ?? 3.848;
    const lng = active?.longitude ?? userCoords?.lng ?? 11.502;
    return { latitude: lat, longitude: lng, latitudeDelta: 0.06, longitudeDelta: 0.06 };
  }, [active, userCoords]);

  function thumb(listing: SearchListing): string | undefined {
    const img = listing.media.find((x) => x.type === "image");
    return img?.thumbUrl ?? img?.url;
  }

  function focusListing(item: SearchListing) {
    hapticLight();
    setPickedId(item.houseId);
    onSelect(item.houseId);
    mapRef.current?.animateToRegion({
      latitude: item.latitude,
      longitude: item.longitude,
      latitudeDelta: 0.04,
      longitudeDelta: 0.04,
    });
  }

  function recenter() {
    if (!userCoords) return;
    mapRef.current?.animateToRegion({
      latitude: userCoords.lat,
      longitude: userCoords.lng,
      latitudeDelta: 0.06,
      longitudeDelta: 0.06,
    });
  }

  const mapBody = (
    <View style={styles.mapWrap}>
      <MapView ref={mapRef} style={styles.map} initialRegion={region} showsUserLocation showsMyLocationButton={false}>
        {listings.map((item) => {
          const selected = item.houseId === activeId;
          return (
            <Marker
              key={item.houseId}
              coordinate={{ latitude: item.latitude, longitude: item.longitude }}
              onPress={() => focusListing(item)}
              tracksViewChanges={selected}
              anchor={{ x: 0.5, y: 1 }}
            >
              <View style={[styles.pricePin, selected && styles.pricePinOn]}>
                <Text style={[styles.pricePinText, selected && styles.pricePinTextOn]}>{rentPin(item.rent)}</Text>
              </View>
            </Marker>
          );
        })}
      </MapView>

      <View style={styles.topRow} pointerEvents="box-none">
        <View style={styles.countCard}>
          <Ionicons name="home-outline" size={18} color={colors.leaf} />
          <Text style={styles.countText}>{m.mapCount(listings.length)}</Text>
        </View>
        {userCoords ? (
          <Pressable style={styles.iconBtn} onPress={recenter} accessibilityLabel={m.searchNearMe}>
            <Ionicons name="navigate" size={20} color={colors.leaf} />
          </Pressable>
        ) : null}
      </View>

      {active ? (
        <Pressable style={styles.card} onPress={() => onOpenListing(active.houseId)}>
          {thumb(active) ? (
            <CachedImage uri={thumb(active)!} style={styles.cardImg} contentFit="cover" />
          ) : (
            <View style={[styles.cardImg, styles.cardPh]}>
              <Ionicons name="home-outline" size={18} color={colors.leaf} />
            </View>
          )}
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {active.location}
            </Text>
            <Text style={styles.cardRent}>{m.browseRent(active.rent)}</Text>
            <Pressable
              style={styles.dirBtn}
              onPress={() => {
                if (active.latitude && active.longitude) openDirections(active.latitude, active.longitude);
              }}
            >
              <Ionicons name="navigate-outline" size={16} color={colors.leaf} />
              <Text style={styles.dirText}>{m.mapDirections}</Text>
            </Pressable>
          </View>
        </Pressable>
      ) : null}
    </View>
  );

  if (embedded) {
    return <View style={styles.root}>{mapBody}</View>;
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={styles.root}>
        <ScreenHeader title={m.mapTitle}>
          <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel={m.detailClose}>
            <Ionicons name="close" size={22} color={colors.onDark} />
            <Text style={styles.closeText}>{m.detailClose}</Text>
          </Pressable>
        </ScreenHeader>
        {mapBody}
        <SafeAreaView style={[styles.footer, { paddingBottom: screenInsets().bottom }]}>
          <Pressable
            style={styles.viewBtn}
            disabled={!active}
            onPress={() => active && onOpenListing(active.houseId)}
          >
            <Text style={styles.viewBtnText}>{m.detailViewListing}</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.paper2 },
    closeBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      alignSelf: "flex-end",
      marginTop: spacing.sm,
      paddingVertical: 4,
    },
    closeText: { color: c.onDark, fontWeight: "600", fontFamily: fontFamily.semibold },
    mapWrap: { flex: 1 },
    map: { flex: 1 },
    topRow: {
      position: "absolute",
      top: spacing.md,
      left: spacing.md,
      right: spacing.md,
      flexDirection: "row",
      alignItems: "center",
    },
    countCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: c.paper,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: radii.md,
    },
    countText: { fontWeight: "600", color: c.ink, fontFamily: fontFamily.semibold },
    iconBtn: {
      marginLeft: "auto",
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.paper,
      alignItems: "center",
      justifyContent: "center",
    },
    pricePin: {
      backgroundColor: c.paper,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: c.line,
    },
    pricePinOn: { backgroundColor: c.leaf, borderColor: c.leaf },
    pricePinText: { fontSize: 12, fontWeight: "700", color: c.ink, fontFamily: fontFamily.bold },
    pricePinTextOn: { color: c.onDark },
    card: {
      position: "absolute",
      left: spacing.md,
      right: spacing.md,
      bottom: 16,
      flexDirection: "row",
      backgroundColor: c.paper,
      borderRadius: radii.lg,
      overflow: "hidden",
    },
    cardImg: { width: 96, height: 96, backgroundColor: c.paper2 },
    cardPh: { alignItems: "center", justifyContent: "center" },
    cardBody: { flex: 1, padding: 10, justifyContent: "center" },
    cardTitle: { fontWeight: "600", color: c.ink, fontFamily: fontFamily.semibold },
    cardRent: { fontSize: 14, fontWeight: "700", color: c.leaf, marginTop: 4, fontFamily: fontFamily.bold },
    dirBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
    dirText: { color: c.leaf, fontWeight: "600", fontSize: 13, fontFamily: fontFamily.semibold },
    footer: {
      backgroundColor: c.paper,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
    },
    viewBtn: {
      backgroundColor: c.leaf,
      borderRadius: radii.md,
      paddingVertical: 14,
      alignItems: "center",
      marginBottom: spacing.sm,
    },
    viewBtnText: { color: c.onDark, fontWeight: "600", fontSize: 16, fontFamily: fontFamily.semibold },
  });
}
