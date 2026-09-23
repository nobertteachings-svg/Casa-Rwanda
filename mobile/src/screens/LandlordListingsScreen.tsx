import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import type { CasaUser, Language, LandlordListingSummary, ListingDetail } from "../api/client";
import {
  deleteListing,
  bulkLandlordStatus,
  getLandlordStats,
  getListingDetail,
  getListingLease,
  getMyListings,
  updateListing,
  updateListingStatus,
  uploadMedia,
} from "../api/client";
import CachedImage from "../components/CachedImage";
import EmptyState from "../components/EmptyState";
import LandlordVerificationBadge from "../components/LandlordVerificationBadge";
import NetworkBanner from "../components/NetworkBanner";
import ScreenHeader from "../components/ScreenHeader";
import ScreenLoader from "../components/ScreenLoader";
import { shareText } from "../utils/share-listing";
import { t } from "../i18n/strings";
import { radii, spacing, type ColorTokens } from "../theme/casa";
import { screenInsets } from "../theme/insets";
import { useCasaTheme } from "../theme/ThemeContext";
import * as ImagePicker from "expo-image-picker";

interface Props {
  token: string;
  user: CasaUser | null;
  uiLanguage: Language;
  onStartVerify?: () => void;
  onStartList?: () => void;
  showCoach?: boolean;
  onCoachDismissed?: () => void;
}

interface EditForm {
  rent: string;
  town: string;
  neighbourhood: string;
  monthsUpfront: string;
  water: boolean;
  parking: boolean;
  fenced: boolean;
  borehole: boolean;
  furnished: boolean;
  security: boolean;
  standbyGenerator: boolean;
}

function formFromListing(d: ListingDetail): EditForm {
  return {
    rent: String(d.rent),
    town: d.town ?? "",
    neighbourhood: d.neighbourhood ?? "",
    monthsUpfront: String(d.monthsUpfront ?? 0),
    water: d.amenities.water,
    parking: d.amenities.parking,
    fenced: d.amenities.fenced,
    borehole: d.amenities.borehole,
    furnished: d.amenities.furnished,
    security: d.amenities.security,
    standbyGenerator: d.amenities.standbyGenerator,
  };
}

export default function LandlordListingsScreen({
  token,
  user,
  uiLanguage,
  onStartVerify,
  onStartList,
  showCoach = false,
  onCoachDismissed,
}: Props) {
  const lang = "en" as const;
  const m = t(lang);
  const { ui, colors } = useCasaTheme();
  const styles = useMemo(() => makeLandlordStyles(colors), [colors]);
  const [listings, setListings] = useState<LandlordListingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [stats, setStats] = useState<Array<{ house_id: string; views: number; unlocks: number }>>([]);
  const [cardStats, setCardStats] = useState<Record<string, { views: number; unlocks: number }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [res, st] = await Promise.all([
        getMyListings(token),
        getLandlordStats(token).catch(() => ({ listings: [], periodDays: 7 })),
      ]);
      setListings(res.listings);
      setStats(st.listings);
      const map: Record<string, { views: number; unlocks: number }> = {};
      for (const s of st.listings) map[s.house_id] = { views: s.views, unlocks: s.unlocks };
      setCardStats(map);
    } catch (e) {
      setError(e instanceof Error ? e.message : m.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, [m.errorGeneric, token]);

  useEffect(() => {
    void load();
  }, [load]);

  function statusLabel(status: string): string {
    return status === "active" ? m.landlordStatusActive : m.landlordStatusRented;
  }

  async function onStatus(houseId: string, status: "active" | "inactive") {
    setBusyId(houseId);
    try {
      await updateListingStatus(token, houseId, status);
      await load();
    } catch (e) {
      Alert.alert(m.errorGeneric, e instanceof Error ? e.message : "");
    } finally {
      setBusyId(null);
    }
  }

  async function onRemove(houseId: string) {
    Alert.alert(m.landlordRemoveTitle, m.landlordRemoveConfirm, [
      { text: m.detailClose, style: "cancel" },
      {
        text: m.landlordRemove,
        style: "destructive",
        onPress: () => {
          void (async () => {
            setBusyId(houseId);
            try {
              await deleteListing(token, houseId);
              await load();
            } catch (e) {
              Alert.alert(m.errorGeneric, e instanceof Error ? e.message : "");
            } finally {
              setBusyId(null);
            }
          })();
        },
      },
    ]);
  }

  async function openEdit(houseId: string) {
    setEditBusy(true);
    try {
      const res = await getListingDetail(token, houseId);
      setEditForm(formFromListing(res.listing));
      setEditId(houseId);
    } catch (e) {
      Alert.alert(m.errorGeneric, e instanceof Error ? e.message : "");
    } finally {
      setEditBusy(false);
    }
  }

  async function saveEdit() {
    if (!editId || !editForm) return;
    const rent = parseInt(editForm.rent.replace(/\D/g, ""), 10);
    if (!Number.isFinite(rent) || rent <= 0) {
      Alert.alert(m.errorGeneric, m.landlordRentRequired);
      return;
    }
    setEditBusy(true);
    try {
      await updateListing(token, editId, {
        rent,
        town: editForm.town.trim() || undefined,
        neighbourhood: editForm.neighbourhood.trim() || undefined,
        monthsUpfront: parseInt(editForm.monthsUpfront, 10) || 0,
        water: editForm.water,
        parking: editForm.parking,
        fenced: editForm.fenced,
        borehole: editForm.borehole,
        furnished: editForm.furnished,
        security: editForm.security,
        standbyGenerator: editForm.standbyGenerator,
      });
      setEditId(null);
      setEditForm(null);
      await load();
    } catch (e) {
      Alert.alert(m.errorGeneric, e instanceof Error ? e.message : "");
    } finally {
      setEditBusy(false);
    }
  }

  function amenityToggle(
    key: keyof Omit<EditForm, "rent" | "town" | "neighbourhood" | "monthsUpfront">,
    label: string
  ) {
    if (!editForm) return null;
    return (
      <View style={styles.toggleRow} key={key}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Switch
          value={editForm[key] as boolean}
          onValueChange={(v) => setEditForm({ ...editForm, [key]: v })}
          trackColor={{ true: colors.leaf }}
        />
      </View>
    );
  }

  async function addMedia(houseId: string, kind: "image" | "video") {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: kind === "video" ? ["videos"] : ["images"],
      quality: 0.7,
      base64: true,
      videoMaxDuration: 90,
    });
    if (result.canceled || !result.assets?.[0]?.base64) return;
    setEditBusy(true);
    try {
      const uploaded = await uploadMedia(token, kind, result.assets[0].base64);
      await updateListing(token, houseId, kind === "video" ? { videosAdd: [uploaded.ref] } : { photosAdd: [uploaded.ref] });
      await load();
    } catch (e) {
      Alert.alert(m.errorGeneric, e instanceof Error ? e.message : "");
    } finally {
      setEditBusy(false);
    }
  }

  async function generateLease(houseId: string) {
    try {
      const res = await getListingLease(token, houseId, true);
      await shareText(m.landlordGenerateLease, res.agreement);
    } catch (e) {
      Alert.alert(m.errorGeneric, e instanceof Error ? e.message : "");
    }
  }

  function openOverflow(item: LandlordListingSummary) {
    const active = item.status === "active";
    Alert.alert(item.type, item.location, [
      { text: m.landlordEdit, onPress: () => void openEdit(item.houseId) },
      { text: m.landlordAddPhotos, onPress: () => void addMedia(item.houseId, "image") },
      { text: m.landlordGenerateLease, onPress: () => void generateLease(item.houseId) },
      {
        text: active ? m.landlordMarkRented : m.landlordReactivate,
        onPress: () => void onStatus(item.houseId, active ? "inactive" : "active"),
      },
      { text: m.landlordRemove, style: "destructive", onPress: () => void onRemove(item.houseId) },
      { text: m.detailClose, style: "cancel" },
    ]);
  }

  return (
    <View style={ui.screen}>
      <NetworkBanner language={lang} />
      <ScreenHeader
        variant="quiet"
        title={m.landlordTitle}
        subtitle={user?.landlordVerified ? undefined : m.verifyBannerTitle}
        right={
          !user?.landlordVerified && onStartVerify ? (
            <Pressable onPress={onStartVerify}>
              <Text style={styles.verifyLink}>{m.verifyBannerCta}</Text>
            </Pressable>
          ) : (
            <LandlordVerificationBadge verified compact language={lang} />
          )
        }
      />

      {showCoach ? (
        <Pressable style={styles.coach} onPress={onCoachDismissed}>
          <Text style={styles.coachText}>{m.coachListPhotos}</Text>
        </Pressable>
      ) : null}

      {stats.length > 0 ? (
        <View style={styles.statsBox}>
          <Text style={styles.statsTitle}>{m.landlordStatsTitle}</Text>
          {stats.slice(0, 4).map((s) => {
            const listing = listings.find((x) => x.houseId === s.house_id);
            return (
              <Text key={s.house_id} style={styles.statsLine}>
                {listing?.location ?? listing?.type ?? m.landlordTitle}: {m.landlordViewsUnlocks(s.views, s.unlocks)}
              </Text>
            );
          })}
          <View style={styles.bulkRow}>
            <Pressable
              style={styles.bulkBtn}
              onPress={() =>
                Alert.alert(m.bulkConfirmActivate, undefined, [
                  { text: m.detailClose, style: "cancel" },
                  { text: m.landlordBulkActivate, onPress: () => void bulkLandlordStatus(token, "active").then(load) },
                ])
              }
            >
              <Text style={styles.bulkText}>{m.landlordBulkActivate}</Text>
            </Pressable>
            <Pressable
              style={[styles.bulkBtn, styles.bulkDanger]}
              onPress={() =>
                Alert.alert(m.bulkConfirmDeactivate, undefined, [
                  { text: m.detailClose, style: "cancel" },
                  { text: m.landlordBulkDeactivate, onPress: () => void bulkLandlordStatus(token, "inactive").then(load) },
                ])
              }
            >
              <Text style={styles.bulkText}>{m.landlordBulkDeactivate}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ScreenLoader count={2} />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.houseId}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon="home-outline"
              title={m.landlordEmpty}
              subtitle={m.landlordEmptyHint}
              actionLabel={onStartList ? m.actionListProperty : undefined}
              onAction={onStartList}
            />
          }
          renderItem={({ item }) => {
            const busy = busyId === item.houseId;
            const active = item.status === "active";
            return (
              <Pressable style={styles.card} onPress={() => void openEdit(item.houseId)}>
                {item.thumbUrl ? (
                  <CachedImage uri={item.thumbUrl} style={styles.thumb} contentFit="cover" />
                ) : (
                  <View style={[styles.thumb, styles.thumbPh]}>
                    <Text style={styles.thumbPhText}>Casa</Text>
                  </View>
                )}
                <View style={styles.cardBody}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardType}>{item.location || item.type}</Text>
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation?.();
                        openOverflow(item);
                      }}
                      hitSlop={8}
                      accessibilityLabel={m.moreActions}
                    >
                      <Ionicons name="ellipsis-horizontal" size={22} color={colors.muted} />
                    </Pressable>
                  </View>
                  <Text style={styles.cardLoc}>{item.type}</Text>
                  <Text style={styles.cardRent}>{m.browseRent(item.rent)}</Text>
                  {cardStats[item.houseId] ? (
                    <Text style={styles.cardStats}>
                      {m.landlordViewsUnlocks(cardStats[item.houseId].views, cardStats[item.houseId].unlocks)}
                    </Text>
                  ) : null}
                  <Text style={[styles.badge, active ? styles.badgeActive : styles.badgeInactive]}>
                    {busy ? "…" : statusLabel(item.status)}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {onStartList ? (
        <Pressable style={styles.fab} onPress={onStartList} accessibilityLabel={m.actionListProperty}>
          <Ionicons name="add" size={28} color={colors.onDark} />
        </Pressable>
      ) : null}

      <Modal
        visible={Boolean(editId && editForm)}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setEditId(null);
          setEditForm(null);
        }}
      >
        <View style={styles.editRoot}>
          <View style={[styles.editHeader, { paddingTop: screenInsets().top }]}>
            <Pressable
              onPress={() => {
                setEditId(null);
                setEditForm(null);
              }}
              hitSlop={12}
              style={styles.editHeaderBtn}
              accessibilityRole="button"
              accessibilityLabel={m.detailClose}
            >
              <Ionicons name="chevron-back" size={24} color={colors.onDark} />
            </Pressable>
            <Text style={styles.editTitle} numberOfLines={1}>
              {m.landlordEditTitle}
            </Text>
            <Pressable
              onPress={() => void saveEdit()}
              disabled={editBusy}
              hitSlop={12}
              style={styles.editHeaderBtn}
              accessibilityRole="button"
              accessibilityLabel={m.landlordSave}
            >
              <Text style={styles.editSave}>{editBusy ? "…" : m.landlordSave}</Text>
            </Pressable>
          </View>
          {editForm ? (
            <ScrollView contentContainerStyle={styles.editScroll}>
              <Text style={styles.label}>{m.landlordRentLabel}</Text>
              <TextInput
                style={styles.input}
                value={editForm.rent}
                onChangeText={(v) => setEditForm({ ...editForm, rent: v })}
                keyboardType="number-pad"
                placeholderTextColor={colors.mutedLight}
              />
              <Text style={styles.label}>{m.landlordMonthsUpfront}</Text>
              <TextInput
                style={styles.input}
                value={editForm.monthsUpfront}
                onChangeText={(v) => setEditForm({ ...editForm, monthsUpfront: v })}
                keyboardType="number-pad"
                placeholderTextColor={colors.mutedLight}
              />
              <Text style={styles.label}>{m.searchTown}</Text>
              <TextInput
                style={styles.input}
                value={editForm.town}
                onChangeText={(v) => setEditForm({ ...editForm, town: v })}
                placeholderTextColor={colors.mutedLight}
              />
              <Text style={styles.label}>{m.searchNeighbourhood}</Text>
              <TextInput
                style={styles.input}
                value={editForm.neighbourhood}
                onChangeText={(v) => setEditForm({ ...editForm, neighbourhood: v })}
                placeholderTextColor={colors.mutedLight}
              />
              <Text style={styles.section}>{m.detailAmenities}</Text>
              {amenityToggle("water", m.detailWater)}
              {amenityToggle("parking", m.detailParking)}
              {amenityToggle("fenced", m.detailFenced)}
              {amenityToggle("borehole", m.detailBorehole)}
              {amenityToggle("furnished", m.detailFurnished)}
              {amenityToggle("security", m.detailSecurity)}
              {amenityToggle("standbyGenerator", m.detailGenerator)}
            </ScrollView>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

function makeLandlordStyles(c: ColorTokens) {
  return StyleSheet.create({
    verifyLink: { color: c.leaf, fontWeight: "700", fontSize: 14 },
    coach: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.sm,
      backgroundColor: c.leaf,
      borderRadius: radii.md,
      padding: spacing.md,
    },
    coachText: { color: c.onDark, fontSize: 14 },
    fab: {
      position: "absolute",
      right: 20,
      bottom: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.leaf,
      alignItems: "center",
      justifyContent: "center",
    },
    bulkDanger: { backgroundColor: c.danger },
    verifyBanner: {
      marginTop: spacing.md,
      backgroundColor: "rgba(255,255,255,0.12)",
      borderRadius: radii.md,
      padding: spacing.md,
    },
    verifyTitle: { color: c.onDark, fontWeight: "800", fontSize: 15, marginTop: spacing.sm },
    verifyBody: { color: c.onDarkMuted, fontSize: 13, marginTop: 6, lineHeight: 19 },
    verifyBtn: { marginTop: spacing.sm },
    landlordActions: { marginTop: spacing.md, gap: spacing.sm },
    actionPrimary: { marginTop: 0 },
    actionSecondaryBtn: {
      backgroundColor: "rgba(255,255,255,0.14)",
      borderRadius: radii.md,
      paddingVertical: 12,
      paddingHorizontal: 14,
      alignItems: "center",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.22)",
    },
    actionSecondaryText: { color: c.onDark, fontWeight: "700", fontSize: 15 },
    listBtn: { marginTop: spacing.sm },
    loader: { marginTop: spacing.xxl },
    list: { padding: spacing.lg, paddingBottom: 100 },
    empty: { textAlign: "center", color: c.muted, marginTop: spacing.xxl, fontSize: 15 },
    error: { color: c.danger, padding: spacing.md },
    card: {
      backgroundColor: c.paper,
      borderRadius: radii.lg,
      overflow: "hidden",
      marginBottom: spacing.xl,
    },
    thumb: { width: "100%", height: 180, backgroundColor: c.paper2 },
    thumbPh: { alignItems: "center", justifyContent: "center" },
    thumbPhText: { color: c.leaf, fontWeight: "700", fontSize: 20 },
    cardBody: { padding: spacing.lg },
    cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    cardType: { fontSize: 16, fontWeight: "600", color: c.ink, flex: 1 },
    badge: { fontSize: 11, fontWeight: "600", paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.sm },
    badgeActive: { backgroundColor: c.successBg, color: c.leaf },
    badgeInactive: { backgroundColor: c.dangerBg, color: c.danger },
    cardLoc: { fontSize: 14, color: c.muted, marginTop: 6 },
    cardRent: { fontSize: 16, fontWeight: "700", color: c.leaf, marginTop: 8 },
    cardStats: { fontSize: 12, color: c.muted, marginTop: 4 },
    cardId: { fontSize: 11, color: c.mutedLight, marginTop: 4 },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
    actionBtn: {
      backgroundColor: c.leaf,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radii.md,
    },
    actionSecondary: { backgroundColor: c.paper, borderWidth: 1, borderColor: c.leaf },
    actionDanger: { backgroundColor: c.paper, borderWidth: 1, borderColor: c.danger },
    actionText: { color: c.onDark, fontWeight: "700", fontSize: 12 },
    actionTextSecondary: { color: c.leaf, fontWeight: "700", fontSize: 12 },
    actionTextDanger: { color: c.danger, fontWeight: "700", fontSize: 12 },
    editRoot: { flex: 1, backgroundColor: c.paper2 },
    editHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: c.leaf,
      paddingBottom: 14,
      paddingHorizontal: 16,
      gap: 12,
    },
    editHeaderBtn: {
      minWidth: 44,
      minHeight: 44,
      justifyContent: "center",
    },
    editTitle: {
      flex: 1,
      color: c.onDark,
      fontWeight: "600",
      fontSize: 16,
      textAlign: "center",
    },
    editSave: { color: c.onDark, fontWeight: "700", textAlign: "right" },
    editScroll: { padding: 16, paddingBottom: 48 },
    label: { fontSize: 13, fontWeight: "700", color: c.inkSoft, marginBottom: 6, marginTop: 10 },
    input: {
      backgroundColor: c.paper,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.lineStrong,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 16,
      color: c.ink,
    },
    section: { fontSize: 15, fontWeight: "600", color: c.ink, marginTop: 16, marginBottom: 8 },
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: c.paper,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: radii.md,
      marginBottom: 8,
    },
    toggleLabel: { fontSize: 14, color: c.inkSoft, fontWeight: "600" },
    statsBox: {
      margin: 16,
      marginBottom: 0,
      backgroundColor: c.paper,
      borderRadius: radii.lg,
      padding: 16,
    },
    statsTitle: { fontWeight: "600", color: c.ink, marginBottom: 6 },
    statsLine: { fontSize: 13, color: c.muted, marginTop: 2 },
    bulkRow: { flexDirection: "row", gap: 8, marginTop: 10 },
    bulkBtn: {
      flex: 1,
      backgroundColor: c.leaf,
      borderRadius: radii.md,
      paddingVertical: 10,
      alignItems: "center",
    },
    bulkText: { color: c.onDark, fontWeight: "700", fontSize: 12 },
  });
}
