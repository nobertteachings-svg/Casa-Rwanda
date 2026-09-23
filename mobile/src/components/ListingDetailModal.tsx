import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import ListingStatsRow from "./ListingStatsRow";
import CasaVideoPlayer from "./CasaVideoPlayer";
import ScreenLoader from "./ScreenLoader";
import type { CasaUser, Language, ListingDetail, SearchListing } from "../api/client";
import {
  addToShortlist,
  flagListingApi,
  flagListingRented,
  getListingConcierge,
  getListingDetail,
  getListingLease,
  getShortlist,
  unlockListing,
  type ConciergeContent,
} from "../api/client";
import CachedImage from "./CachedImage";
import TrustBadge from "./TrustBadge";
import MediaGalleryModal from "./MediaGalleryModal";
import ConciergeSheet from "./ConciergeSheet";
import { t } from "../i18n/strings";
import { callPhone, openDirections, openWhatsApp } from "../utils/contact";
import { hapticMedium } from "../utils/haptics";
import { shareListing, shareText } from "../utils/share-listing";
import { radii, shadow, spacing, type ColorTokens } from "../theme/casa";
import { screenInsets } from "../theme/insets";
import { useCasaTheme } from "../theme/ThemeContext";

interface Props {
  visible: boolean;
  houseId: string | null;
  token: string;
  user: CasaUser | null;
  uiLanguage: Language;
  onClose: () => void;
  onListingUpdated?: (listing: ListingDetail) => void;
  onUnlocked?: () => void;
  onShortlistChange?: () => void;
  onNeedLogin?: () => void;
  preview?: SearchListing | null;
  lowDataMode?: boolean;
}

function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

function searchToDetail(item: SearchListing): ListingDetail {
  return {
    houseId: item.houseId,
    type: item.type,
    propertyCategory: item.propertyCategory,
    bedroomCount: item.bedroomCount,
    toiletCount: item.toiletCount,
    rent: item.rent,
    monthsUpfront: item.monthsUpfront ?? 0,
    location: item.location,
    latitude: item.latitude,
    longitude: item.longitude,
    distanceKm: item.distanceKm,
    status: "active",
    media: item.media,
    amenities: {
      water: false,
      parking: false,
      fenced: false,
      borehole: false,
      furnished: false,
      security: false,
      standbyGenerator: false,
    },
    unlocked: false,
    landlordVerified: item.landlordVerified,
    trustTier: item.trustTier,
    listedAt: item.listedAt,
    isOwner: false,
  };
}

export default function ListingDetailModal({
  visible,
  houseId,
  token,
  user,
  uiLanguage,
  onClose,
  onListingUpdated,
  onUnlocked,
  onShortlistChange,
  onNeedLogin,
  preview,
  lowDataMode = false,
}: Props) {
  const lang = "en" as const;
  const m = t(lang);
  const { colors, gradient } = useCasaTheme();
  const styles = useMemo(() => makeDetailStyles(colors), [colors]);
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mediaIdx, setMediaIdx] = useState(0);
  const [unlockBusy, setUnlockBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [conciergeOpen, setConciergeOpen] = useState(false);
  const [concierge, setConcierge] = useState<ConciergeContent | null>(null);

  const load = useCallback(async () => {
    if (!houseId) return;
    setLoading(true);
    setError("");
    try {
      const [res, shortlist] = await Promise.all([
        getListingDetail(token || undefined, houseId),
        user?.role === "tenant" && token ? getShortlist(token).catch(() => ({ items: [] })) : Promise.resolve({ items: [] }),
      ]);
      setListing(res.listing);
      setSaved(shortlist.items.some((x) => x.houseId === houseId));
      setMediaIdx(0);
      if (res.listing.unlocked && user?.role === "tenant") {
        getListingConcierge(token, houseId)
          .then((c) => setConcierge(c.concierge))
          .catch(() => setConcierge(null));
      }
    } catch (e) {
      if (preview && preview.houseId === houseId) {
        setListing(searchToDetail(preview));
        setError("");
      } else {
        setError(e instanceof Error ? e.message : m.errorGeneric);
        setListing(null);
      }
    } finally {
      setLoading(false);
    }
  }, [houseId, m.errorGeneric, preview, token, user?.role]);

  useEffect(() => {
    if (visible && houseId) void load();
    if (!visible) {
      setListing(null);
      setError("");
      setReportOpen(false);
      setReportReason("");
    }
  }, [visible, houseId, load]);

  const media = listing?.media ?? [];
  const current = media[mediaIdx];
  const amenityList = listing
    ? [
        listing.amenities.water && m.detailWater,
        listing.amenities.parking && m.detailParking,
        listing.amenities.fenced && m.detailFenced,
        listing.amenities.borehole && m.detailBorehole,
        listing.amenities.furnished && m.detailFurnished,
        listing.amenities.security && m.detailSecurity,
        listing.amenities.standbyGenerator && m.detailGenerator,
      ].filter(Boolean)
    : [];

  const canContact = Boolean(listing?.unlocked && listing.landlordPhone);
  const isTenant = user?.role === "tenant";
  const showHeart = !listing?.isOwner;
  const showUnlock = Boolean(listing && listing.status === "active" && !listing.unlocked && !listing.isOwner);
  const listedDays = useMemo(
    () => (listing?.listedAt ? daysSince(listing.listedAt) : null),
    [listing?.listedAt]
  );

  async function onSave() {
    if (!houseId || saved) return;
    if (!token || user?.role !== "tenant") {
      onNeedLogin?.();
      return;
    }
    try {
      await addToShortlist(token, houseId);
      setSaved(true);
      hapticMedium();
      onShortlistChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : m.errorGeneric);
    }
  }

  async function onUnlock() {
    if (!houseId) return;
    if (!token || user?.role !== "tenant") {
      onNeedLogin?.();
      return;
    }
    setUnlockBusy(true);
    setError("");
    try {
      const res = await unlockListing(token, houseId);
      if (res.ok) {
        if (res.listing) {
          setListing(res.listing);
          onListingUpdated?.(res.listing);
        } else {
          await load();
        }
        if (res.concierge) setConcierge(res.concierge);
        onUnlocked?.();
      } else if (res.reason === "payment_required") {
        setError(m.unlockComingSoon);
      } else {
        setError(m.errorGeneric);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : m.errorGeneric);
    } finally {
      setUnlockBusy(false);
    }
  }

  async function onShare() {
    if (!listing) return;
    await shareListing(listing.houseId, listing.type, listing.rent, lang);
  }

  async function onLease() {
    if (!houseId) return;
    try {
      const res = await getListingLease(token, houseId, listing?.isOwner);
      await shareText(m.detailLease, res.agreement);
    } catch (e) {
      setError(e instanceof Error ? e.message : m.errorGeneric);
    }
  }

  async function onReportRented() {
    if (!houseId) return;
    try {
      await flagListingRented(token, houseId);
      Alert.alert(m.detailReportRented, m.detailReportRentedThanks);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : m.errorGeneric);
    }
  }

  const meterLabel =
    listing?.amenities.electricityMeter === "prepaid"
      ? lang === "fr"
        ? "Prépayé"
        : "Token meter"
      : listing?.amenities.electricityMeter === "postpaid"
        ? lang === "fr"
          ? "Postpayé"
          : "Postpaid bill"
        : listing?.amenities.electricityMeter === "none"
          ? lang === "fr"
            ? "Aucun"
            : "None"
          : null;

  async function submitReport() {
    if (!houseId || reportReason.trim().length < 3) return;
    setReportBusy(true);
    try {
      await flagListingApi(token, houseId, reportReason.trim());
      setReportOpen(false);
      Alert.alert(m.detailReport, m.detailReportThanks);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : m.errorGeneric);
    } finally {
      setReportBusy(false);
    }
  }

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <View style={styles.root}>
        <LinearGradient colors={[...gradient.header]} style={[styles.header, { paddingTop: screenInsets().top }]}>
          <View style={styles.headerSafe}>
            <View style={styles.headerRow}>
              <Pressable onPress={onClose} hitSlop={12} accessibilityLabel={m.detailClose}>
                <Ionicons name="chevron-back" size={24} color={colors.onDark} />
              </Pressable>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {listing?.location ?? m.detailTitle}
              </Text>
              <View style={styles.headerActions}>
              {showHeart ? (
                  <Pressable onPress={() => void onSave()} hitSlop={8} accessibilityLabel={saved ? m.detailSaved : m.detailSave}>
                    <Ionicons name={saved ? "heart" : "heart-outline"} size={22} color={colors.onDark} />
                  </Pressable>
                ) : null}
                <Pressable onPress={() => void onShare()} hitSlop={8} accessibilityLabel={m.detailShare}>
                  <Ionicons name="share-outline" size={22} color={colors.onDark} />
                </Pressable>
              </View>
            </View>
          </View>
        </LinearGradient>

          {loading ? (
            <ScreenLoader count={1} />
          ) : error && !listing ? (
            <View style={styles.retryBox}>
              <Text style={styles.error}>{error}</Text>
              <Pressable style={styles.dirBtn} onPress={() => void load()}>
                <Text style={styles.dirBtnText}>{m.detailRetry}</Text>
              </Pressable>
            </View>
          ) : listing ? (
            <>
            <ScrollView contentContainerStyle={styles.scroll}>
              <View style={styles.mediaWrap}>
                <Pressable onPress={() => setGalleryOpen(true)}>
                  {current?.type === "video" && !lowDataMode ? (
                    <CasaVideoPlayer key={current.url} uri={current.url} style={styles.hero} />
                  ) : current ? (
                    <CachedImage uri={current.url} style={styles.hero} contentFit="cover" />
                  ) : (
                    <View style={[styles.hero, styles.heroPh]}>
                      <Text style={styles.heroPhText}>Casa</Text>
                    </View>
                  )}
                </Pressable>
                {media.length > 0 ? (
                  <Pressable onPress={() => setGalleryOpen(true)}>
                    <Text style={styles.galleryLink}>{m.detailGallery}</Text>
                  </Pressable>
                ) : null}
                {media.length > 1 ? (
                  <ScrollView horizontal style={styles.thumbs} showsHorizontalScrollIndicator={false}>
                    {media.map((item, idx) => (
                      <Pressable key={`${item.url}-${idx}`} onPress={() => setMediaIdx(idx)}>
                        <CachedImage
                          uri={item.thumbUrl}
                          style={[styles.thumb, idx === mediaIdx && styles.thumbActive]}
                        />
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : null}
              </View>

              <Text style={styles.type}>{listing.type}</Text>
              <TrustBadge
                trustTier={listing.trustTier}
                landlordVerified={listing.landlordVerified}
                language={lang}
              />
              <Text style={styles.location}>{listing.location}</Text>
              <Text style={styles.rent}>{m.browseRent(listing.rent)}</Text>
              <ListingStatsRow
                items={[
                  ...(listing.bedroomCount != null
                    ? [{ icon: "bed-outline" as const, label: m.searchMinBeds, value: String(listing.bedroomCount) }]
                    : []),
                  ...(listing.toiletCount != null
                    ? [{ icon: "water-outline" as const, label: m.searchMinToilets, value: String(listing.toiletCount) }]
                    : []),
                  ...(meterLabel
                    ? [{ icon: "flash-outline" as const, label: m.searchElectricity, value: meterLabel }]
                    : []),
                ]}
              />
              {listedDays !== null ? (
                <Text style={styles.meta}>{m.detailListedAgo(listedDays)}</Text>
              ) : null}
              {listing.monthsUpfront > 0 ? (
                <Text style={styles.meta}>{m.detailMonthsUpfront(listing.monthsUpfront)}</Text>
              ) : null}
              {listing.distanceKm !== undefined ? (
                <Text style={styles.meta}>{m.searchDistance(listing.distanceKm)}</Text>
              ) : null}
              {listing.status !== "active" ? (
                <Text style={styles.statusBadge}>{m.detailInactive}</Text>
              ) : null}

              {amenityList.length > 0 ? (
                <View style={styles.amenities}>
                  <Text style={styles.section}>{m.detailAmenities}</Text>
                  <View style={styles.amenityWrap}>
                    {amenityList.map((label) => (
                      <View key={String(label)} style={styles.amenityChip}>
                        <Text style={styles.amenityChipText}>{label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {listing.description ? (
                <View style={styles.descBlock}>
                  <Text style={styles.section}>{m.detailDescription}</Text>
                  <Text style={styles.desc}>{listing.description}</Text>
                </View>
              ) : null}

              {error ? <Text style={styles.error}>{error}</Text> : null}

              {isTenant && listing.status === "active" ? (
                <Pressable style={styles.reportLink} onPress={() => setReportOpen(true)}>
                  <Text style={styles.reportLinkText}>{m.detailReport}</Text>
                </Pressable>
              ) : null}

              {canContact ? (
                <>
                  <Pressable style={styles.dirBtn} onPress={() => setConciergeOpen(true)}>
                    <Text style={styles.dirBtnText}>{m.detailConcierge}</Text>
                  </Pressable>
                  <Pressable style={styles.dirBtn} onPress={() => void onLease()}>
                    <Text style={styles.dirBtnText}>{m.detailLease}</Text>
                  </Pressable>
                </>
              ) : null}

              <Pressable
                style={styles.dirBtn}
                onPress={() => openDirections(listing.latitude, listing.longitude)}
              >
                <Text style={styles.dirBtnText}>{m.detailDirections}</Text>
              </Pressable>
            </ScrollView>

            <View style={[styles.footerSafe, { paddingBottom: screenInsets().bottom }]}>
              {canContact ? (
                <View style={styles.footerRow}>
                  <Pressable
                    style={[styles.footerBtn, styles.footerCall]}
                    onPress={() => callPhone(listing.landlordPhone!)}
                  >
                    <Ionicons name="call" size={20} color={colors.onDark} />
                    <Text style={styles.footerBtnText}>{m.detailCall}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.footerBtn, styles.footerWa]}
                    onPress={() =>
                      openWhatsApp(
                        listing.landlordPhone!,
                        lang === "fr"
                          ? `Bonjour, je suis intéressé par votre annonce Casa (${listing.houseId}).`
                          : `Hello, I'm interested in your Casa listing (${listing.houseId}).`
                      )
                    }
                  >
                    <Ionicons name="logo-whatsapp" size={20} color={colors.onDark} />
                    <Text style={styles.footerBtnText}>{m.detailWhatsApp}</Text>
                  </Pressable>
                </View>
              ) : showUnlock ? (
                <Pressable style={styles.footerPrimary} onPress={() => void onUnlock()} disabled={unlockBusy}>
                  <Ionicons name="lock-open-outline" size={20} color={colors.onDark} />
                  <Text style={styles.footerPrimaryText}>{m.browseUnlock}</Text>
                </Pressable>
              ) : null}
            </View>
            </>
          ) : null}

          {reportOpen ? (
            <View style={styles.reportOverlay}>
              <View style={styles.reportBox}>
                <Text style={styles.section}>{m.detailReportTitle}</Text>
                <TextInput
                  style={styles.reportInput}
                  value={reportReason}
                  onChangeText={setReportReason}
                  placeholder={m.detailReportPlaceholder}
                  placeholderTextColor="#8a9a90"
                  multiline
                />
                <View style={styles.rowActions}>
                  <Pressable style={styles.secondaryBtn} onPress={() => setReportOpen(false)}>
                    <Text style={styles.secondaryBtnText}>{m.detailClose}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.unlockBtn}
                    disabled={reportBusy}
                    onPress={() => void submitReport()}
                  >
                    <Text style={styles.unlockText}>{m.detailReportSubmit}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>

      <MediaGalleryModal
        visible={galleryOpen}
        media={media}
        startIndex={mediaIdx}
        lowDataMode={lowDataMode}
        closeLabel={m.detailClose}
        onClose={() => setGalleryOpen(false)}
      />

      <ConciergeSheet
        visible={conciergeOpen}
        content={concierge}
        title={m.detailConcierge}
        leaseLabel={m.detailLease}
        reportRentedLabel={m.detailReportRented}
        closeLabel={m.detailClose}
        onClose={() => setConciergeOpen(false)}
        onLease={() => void onLease()}
        onReportRented={() => void onReportRented()}
      />
    </>
  );
}

function makeDetailStyles(c: ColorTokens) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: c.paper2 },
  header: {
    paddingBottom: 4,
  },
  headerSafe: { paddingHorizontal: spacing.lg },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    gap: 12,
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 12, minWidth: 56, justifyContent: "flex-end" },
  close: { color: c.onDark, fontWeight: "600", fontSize: 16 },
  headerTitle: { flex: 1, color: c.onDark, fontWeight: "600", fontSize: 16, textAlign: "center" },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl },
  mediaWrap: { marginBottom: spacing.md },
  hero: { width: "100%", height: 240, borderRadius: radii.lg, backgroundColor: c.paper2 },
  heroPh: { alignItems: "center", justifyContent: "center" },
  heroPhText: { color: c.leaf, fontWeight: "800", fontSize: 24 },
  thumbs: { marginTop: spacing.sm },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radii.sm,
    marginRight: spacing.sm,
    borderWidth: 2,
    borderColor: "transparent",
  },
  thumbActive: { borderColor: c.leaf },
  type: { fontSize: 20, fontWeight: "600", color: c.ink, letterSpacing: -0.3 },
  location: { fontSize: 15, color: c.muted, marginTop: 6 },
  rent: { fontSize: 18, fontWeight: "700", color: c.leaf, marginTop: spacing.sm },
  meta: { fontSize: 13, color: c.muted, marginTop: 4 },
  statusBadge: {
    alignSelf: "flex-start",
    marginTop: spacing.sm,
    backgroundColor: c.dangerBg,
    color: c.danger,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.sm,
    fontWeight: "700",
    fontSize: 12,
  },
  section: { fontSize: 14, fontWeight: "800", color: c.forest, marginBottom: 6 },
  amenities: { marginTop: spacing.lg },
  amenityWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  amenityChip: {
    backgroundColor: c.successBg,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  amenityChipText: { fontSize: 13, color: c.leaf, fontWeight: "600" },
  reportLink: { marginTop: spacing.lg, alignSelf: "flex-start" },
  reportLinkText: { color: c.muted, fontSize: 13, fontWeight: "600" },
  descBlock: { marginTop: spacing.lg },
  desc: { fontSize: 14, color: c.inkSoft, lineHeight: 21 },
  rowActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: c.leaf,
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: c.paper,
  },
  secondaryBtnText: { color: c.leaf, fontWeight: "600", fontSize: 13 },
  dirBtn: {
    marginTop: spacing.xl,
    backgroundColor: c.paper,
    borderWidth: 1,
    borderColor: c.leaf,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  dirBtnText: { color: c.leaf, fontWeight: "600", fontSize: 15 },
  contactRow: { flexDirection: "row", gap: 10, marginTop: spacing.md },
  contactBtn: { flex: 1, borderRadius: radii.sm, paddingVertical: 14, alignItems: "center" },
  callBtn: { backgroundColor: c.leaf },
  waBtn: { backgroundColor: c.wa },
  contactBtnText: { color: c.onDark, fontWeight: "800", fontSize: 14 },
  unlockBtn: {
    flex: 1,
    marginTop: spacing.lg,
    backgroundColor: c.leaf,
    borderRadius: radii.sm,
    paddingVertical: 14,
    alignItems: "center",
    ...shadow.sm,
  },
  unlockText: { color: c.onDark, fontWeight: "800", fontSize: 15 },
  error: { color: c.danger, padding: spacing.lg, textAlign: "center" },
  retryBox: { padding: spacing.lg, alignItems: "center" },
  galleryLink: { color: c.leaf, fontWeight: "700", marginTop: spacing.sm, fontSize: 13 },
  quoteBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: c.successBg,
    borderRadius: radii.sm,
  },
  quoteFee: { fontSize: 16, fontWeight: "800", color: c.leaf },
  reportOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(9, 28, 22, 0.45)",
    justifyContent: "center",
    padding: spacing.xl,
  },
  reportBox: {
    backgroundColor: c.paper,
    borderRadius: radii.md,
    padding: spacing.lg,
    ...shadow.lg,
  },
  reportInput: {
    borderWidth: 1,
    borderColor: c.lineStrong,
    borderRadius: radii.sm,
    minHeight: 80,
    padding: 10,
    textAlignVertical: "top",
    marginBottom: spacing.md,
    color: c.ink,
  },
  footerSafe: {
    backgroundColor: c.paper,
    borderTopWidth: 1,
    borderTopColor: c.line,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    ...shadow.md,
  },
  footerRow: { flexDirection: "row", gap: spacing.sm, paddingBottom: spacing.sm },
  footerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radii.md,
    paddingVertical: 14,
  },
  footerCall: { backgroundColor: c.leaf },
  footerWa: { backgroundColor: c.wa },
  footerBtnText: { color: c.onDark, fontWeight: "600", fontSize: 14 },
  footerPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: c.leaf,
    borderRadius: radii.md,
    paddingVertical: 16,
    marginBottom: spacing.sm,
    ...shadow.sm,
  },
  footerPrimaryText: { color: c.onDark, fontWeight: "600", fontSize: 16 },
});
}
