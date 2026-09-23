import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Location from "expo-location";
import type { CasaUser, Language, SearchListing } from "../api/client";
import {
  addToShortlist,
  createSavedSearchAlert,
  getShortlist,
  removeShortlistItem,
  searchListings,
} from "../api/client";
import { loadSearchCache, saveSearchCache } from "../storage/app-cache";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import ListingDetailModal from "../components/ListingDetailModal";
import NearbyMapScreen from "../components/NearbyMapScreen";
import EmptyState from "../components/EmptyState";
import FilterSheet, { countActiveFilters, emptyFilters, type FilterValues } from "../components/FilterSheet";
import ListingCard from "../components/ListingCard";
import NetworkBanner from "../components/NetworkBanner";
import ScreenLoader from "../components/ScreenLoader";
import CasaToast from "../components/CasaToast";
import CasaLogo from "../components/CasaLogo";
import { t } from "../i18n/strings";
import { radii, spacing, type ColorTokens } from "../theme/casa";
import { fontFamily } from "../theme/fonts";
import { screenInsets } from "../theme/insets";
import { useCasaTheme } from "../theme/ThemeContext";

interface Props {
  token: string;
  user: CasaUser | null;
  uiLanguage: Language;
  initialDetailId?: string | null;
  onInitialDetailHandled?: () => void;
  onSearchSaved?: (description: string) => void;
  onShortlistChange?: () => void;
  onUnlocked?: () => void;
  lowDataMode?: boolean;
  showCoach?: boolean;
  onCoachDismissed?: () => void;
  onNeedLogin?: () => void;
}

export default function BrowseScreen({
  token,
  user,
  uiLanguage,
  initialDetailId,
  onInitialDetailHandled,
  onSearchSaved,
  onShortlistChange,
  onUnlocked,
  lowDataMode = false,
  showCoach = false,
  onCoachDismissed,
  onNeedLogin,
}: Props) {
  const lang = "en" as const;
  const m = t(lang);
  const online = useNetworkStatus();
  const { colors, ui } = useCasaTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<FilterValues>(emptyFilters);
  const [filters, setFilters] = useState<FilterValues>(emptyFilters);
  const [listings, setListings] = useState<SearchListing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [cachedHint, setCachedHint] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSearchDesc, setLastSearchDesc] = useState("");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [locationDenied, setLocationDenied] = useState(false);
  const [usingQuery, setUsingQuery] = useState(false);

  const parseRent = (v: string) => {
    const n = parseInt(v.replace(/\D/g, ""), 10);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  const searchExtras = useCallback(
    (f: FilterValues) => ({
      minRent: parseRent(f.minRent),
      maxRent: parseRent(f.maxRent),
      parking: f.parking,
      water: f.water,
      fenced: f.fenced,
      standbyGenerator: f.standbyGenerator,
      furnished: f.furnished,
      security: f.security,
      propertyCategory: f.propertyCategory === "either" ? undefined : f.propertyCategory,
      propertySubtype: f.propertySubtype || undefined,
      minBedrooms: parseInt(f.minBedrooms, 10) || undefined,
      minToilets: parseInt(f.minToilets, 10) || undefined,
      electricityMeter: f.electricityMeter || undefined,
      sort: f.sort,
    }),
    []
  );

  const restoreCachedSearch = useCallback(async (): Promise<boolean> => {
    const cached = await loadSearchCache();
    if (!cached?.listings?.length) return false;
    setListings(cached.listings);
    setTotal(cached.total);
    setCachedHint(true);
    if (cached.listings[0]) setSelectedId(cached.listings[0].houseId);
    return true;
  }, []);

  useEffect(() => {
    void loadSearchCache().then((cached) => {
      if (cached?.listings?.length) {
        setListings(cached.listings);
        setTotal(cached.total);
        setCachedHint(true);
        if (cached.listings[0]) setSelectedId(cached.listings[0].houseId);
      }
    });
    if (user?.role === "tenant" && token) {
      void getShortlist(token)
        .then((res) => setSavedIds(new Set(res.items.map((x) => x.houseId))))
        .catch(() => undefined);
    }
  }, [token, user?.role]);

  useEffect(() => {
    if (initialDetailId) {
      setDetailId(initialDetailId);
      onInitialDetailHandled?.();
    }
  }, [initialDetailId, onInitialDetailHandled]);

  const applyResults = useCallback(
    async (data: { listings: SearchListing[]; total: number; updatedAt: string }, desc: string) => {
      setListings(data.listings);
      setTotal(data.total);
      setCachedHint(false);
      setError("");
      setLastSearchDesc(desc);
      onSearchSaved?.(desc);
      if (data.listings[0]) setSelectedId(data.listings[0].houseId);
      await saveSearchCache({ listings: data.listings, total: data.total, updatedAt: data.updatedAt });
    },
    [onSearchSaved]
  );

  const runGpsSearch = useCallback(
    async (f: FilterValues = filters) => {
      if (!online) {
        const had = await restoreCachedSearch();
        if (!had) setError(m.offlineBanner);
        return;
      }
      setLoading(true);
      setError("");
      setLocationDenied(false);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationDenied(true);
          setError("");
          return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        const lat = loc.coords.latitude;
        const lng = loc.coords.longitude;
        setUserCoords({ lat, lng });
        const data = await searchListings({
          mode: "gps",
          lat,
          lng,
          lang,
          ...searchExtras(f),
        });
        setUsingQuery(false);
        await applyResults(data, m.searchModeMap);
      } catch (e) {
        const had = await restoreCachedSearch();
        setError(had ? "" : e instanceof Error ? e.message : m.errorGeneric);
      } finally {
        setLoading(false);
      }
    },
    [applyResults, filters, lang, m.errorGeneric, m.offlineBanner, m.searchModeMap, online, restoreCachedSearch, searchExtras]
  );

  const runQuerySearch = useCallback(
    async (q: string, f: FilterValues = filters) => {
      const place = q.trim();
      if (!place) {
        void runGpsSearch(f);
        return;
      }
      if (!online) {
        const had = await restoreCachedSearch();
        if (!had) setError(m.offlineBanner);
        return;
      }
      if (parseRent(f.minRent) && parseRent(f.maxRent) && (parseRent(f.minRent) ?? 0) > (parseRent(f.maxRent) ?? 0)) {
        setError(m.searchValidationRent);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const extras = {
          region: f.regionId || undefined,
          lang,
          ...searchExtras(f),
        };
        let data;
        try {
          data = await searchListings({ mode: "manual", place, ...extras });
        } catch {
          data = await searchListings({ mode: "manual", town: place, ...extras });
        }
        setUsingQuery(true);
        await applyResults(data, place);
      } catch (e) {
        const had = await restoreCachedSearch();
        setError(had ? "" : e instanceof Error ? e.message : m.errorGeneric);
      } finally {
        setLoading(false);
      }
    },
    [applyResults, filters, lang, m.errorGeneric, m.offlineBanner, m.searchValidationRent, online, restoreCachedSearch, runGpsSearch, searchExtras]
  );

  useEffect(() => {
    if (online) void runGpsSearch();
    else void restoreCachedSearch();
    // Initial GPS once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  async function saveCurrentSearch() {
    if (!token || user?.role !== "tenant") {
      onNeedLogin?.();
      return;
    }
    const desc = lastSearchDesc || query.trim() || m.searchTitle;
    try {
      await createSavedSearchAlert(token, {
        description: desc,
        filters: {
          ...searchExtras(filters),
          region: filters.regionId || undefined,
          town: query.trim() || undefined,
        },
      });
      setToast(m.saveSearchDone);
      setToastVisible(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : m.errorGeneric);
    }
  }

  async function toggleSave(houseId: string) {
    if (!token || user?.role !== "tenant") {
      onNeedLogin?.();
      return;
    }
    const next = new Set(savedIds);
    try {
      if (next.has(houseId)) {
        await removeShortlistItem(token, houseId);
        next.delete(houseId);
      } else {
        await addToShortlist(token, houseId);
        next.add(houseId);
      }
      setSavedIds(next);
      onShortlistChange?.();
    } catch (e) {
      setToast(e instanceof Error ? e.message : m.errorGeneric);
      setToastVisible(true);
    }
  }

  function thumb(listing: SearchListing): string | undefined {
    const img = listing.media.find((x) => x.type === "image");
    return img?.thumbUrl ?? img?.url;
  }

  const filterCount = countActiveFilters(filters);

  function showUnlockSuccess() {
    setToast(m.unlockSuccessHint);
    setToastVisible(true);
    onUnlocked?.();
  }

  return (
    <View style={ui.screen}>
      <NetworkBanner language={lang} />
      {cachedHint && !online ? (
        <View style={styles.cachedBanner}>
          <Text style={styles.cachedBannerText}>{m.cachedResultsHint}</Text>
        </View>
      ) : null}

      <View style={[styles.searchSafe, { paddingTop: screenInsets().top }]}>
      <View style={styles.searchBar}>
        <CasaLogo width={56} />
        <View style={styles.searchField}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={m.searchPlaceholder}
            placeholderTextColor={colors.mutedLight}
            returnKeyType="search"
            onSubmitEditing={() => {
              Keyboard.dismiss();
              void runQuerySearch(query);
            }}
          />
          {query ? (
            <Pressable
              onPress={() => {
                setQuery("");
                setViewMode("map");
                void runGpsSearch();
              }}
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={18} color={colors.mutedLight} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          style={[styles.iconBtn, filterCount > 0 && styles.iconBtnOn]}
          onPress={() => {
            setDraftFilters(filters);
            setFiltersOpen(true);
            onCoachDismissed?.();
          }}
          accessibilityLabel={m.filtersCount(filterCount)}
        >
          <Ionicons name="options-outline" size={20} color={filterCount > 0 ? colors.onDark : colors.ink} />
          {filterCount > 0 ? <View style={styles.filterDot} /> : null}
        </Pressable>
        <Pressable
          style={styles.iconBtn}
          onPress={() => setViewMode((v) => (v === "map" ? "list" : "map"))}
          accessibilityLabel={viewMode === "map" ? m.listView : m.mapView}
        >
          <Ionicons name={viewMode === "map" ? "list-outline" : "map-outline"} size={20} color={colors.ink} />
        </Pressable>
      </View>
      </View>

      {showCoach ? (
        <Pressable style={styles.coach} onPress={onCoachDismissed}>
          <Text style={styles.coachText}>{m.coachFilters}</Text>
        </Pressable>
      ) : null}

      {error ? (
        <Pressable
          style={styles.errorRow}
          onPress={() => void (usingQuery ? runQuerySearch(query) : runGpsSearch())}
        >
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorRetry}>{m.errorRetry}</Text>
        </Pressable>
      ) : null}

      {locationDenied && listings.length === 0 ? (
        <Text style={styles.locationHint}>{m.locationTypeHint}</Text>
      ) : null}

      {user?.role === "tenant" && total > 0 ? (
        <Pressable style={styles.saveSearchBtn} onPress={() => void saveCurrentSearch()}>
          <Ionicons name="notifications-outline" size={16} color={colors.leaf} />
          <Text style={styles.saveSearchText}>{m.saveSearch}</Text>
        </Pressable>
      ) : null}

      {viewMode === "map" ? (
        <View style={styles.mapPane}>
          {loading && listings.length === 0 ? (
            <View style={styles.loadingOverlay}>
              <ScreenLoader count={2} />
              <Text style={styles.loadingHint}>{m.searching}</Text>
            </View>
          ) : (
            <NearbyMapScreen
              embedded
              listings={listings}
              language={lang}
              userCoords={userCoords}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onOpenListing={setDetailId}
            />
          )}
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.houseId}
          contentContainerStyle={styles.vList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void (usingQuery ? runQuerySearch(query) : runGpsSearch()).finally(() => setRefreshing(false));
              }}
            />
          }
          ListHeaderComponent={
            loading && listings.length === 0 ? (
              <View>
                <ScreenLoader count={2} />
                <Text style={styles.loadingHint}>{m.searching}</Text>
              </View>
            ) : total > 0 ? (
              <Text style={styles.resultCount}>{m.searchResults(total)}</Text>
            ) : null
          }
          ListEmptyComponent={
            !loading ? (
              <EmptyState icon="search-outline" title={m.searchEmpty} subtitle={m.searchEmptyHint} />
            ) : null
          }
          renderItem={({ item }) => (
            <ListingCard
              type={item.type}
              location={item.location}
              rentLabel={m.browseRent(item.rent)}
              thumbUrl={thumb(item)}
              trustTier={item.trustTier}
              landlordVerified={item.landlordVerified}
              distanceLabel={item.distanceKm !== undefined ? m.searchDistance(item.distanceKm) : undefined}
              language={lang}
              bedroomCount={item.bedroomCount}
              toiletCount={item.toiletCount}
              monthsUpfront={item.monthsUpfront}
              photoCount={item.media.length}
              saved={savedIds.has(item.houseId)}
              onToggleSave={() => void toggleSave(item.houseId)}
              onPress={() => {
                setSelectedId(item.houseId);
                setDetailId(item.houseId);
              }}
            />
          )}
        />
      )}

      {loading && listings.length > 0 ? (
        <View style={styles.busyBar}>
          <ActivityIndicator color={colors.leaf} size="small" />
        </View>
      ) : null}

      <FilterSheet
        visible={filtersOpen}
        language={lang}
        values={draftFilters}
        onChange={setDraftFilters}
        onClear={() => setDraftFilters(emptyFilters())}
        onClose={() => setFiltersOpen(false)}
        onApply={() => {
          setFilters(draftFilters);
          setFiltersOpen(false);
          void (usingQuery || query.trim() ? runQuerySearch(query, draftFilters) : runGpsSearch(draftFilters));
        }}
      />

      <CasaToast
        message={toast}
        visible={toastVisible}
        onDismiss={() => {
          setToastVisible(false);
          setToast("");
        }}
      />

      <ListingDetailModal
        visible={Boolean(detailId)}
        houseId={detailId}
        token={token}
        user={user}
        uiLanguage={uiLanguage}
        onClose={() => setDetailId(null)}
        onUnlocked={showUnlockSuccess}
        onShortlistChange={() => {
          onShortlistChange?.();
          if (token) {
            void getShortlist(token)
              .then((res) => setSavedIds(new Set(res.items.map((x) => x.houseId))))
              .catch(() => undefined);
          }
        }}
        onNeedLogin={onNeedLogin}
        preview={listings.find((x) => x.houseId === detailId) ?? null}
        lowDataMode={lowDataMode}
      />
    </View>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    searchSafe: { backgroundColor: c.paper },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
      backgroundColor: c.paper,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.line,
    },
    searchField: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: c.paper2,
      borderRadius: radii.pill,
      paddingHorizontal: 12,
      height: 44,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: c.ink,
      fontFamily: fontFamily.regular,
    },
    iconBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.paper2,
      alignItems: "center",
      justifyContent: "center",
    },
    iconBtnOn: { backgroundColor: c.leaf },
    filterDot: {
      position: "absolute",
      top: 8,
      right: 8,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.gold,
    },
    coach: {
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      backgroundColor: c.leaf,
      borderRadius: radii.md,
      padding: spacing.md,
    },
    coachText: { color: c.onDark, fontSize: 14, fontFamily: fontFamily.medium },
    cachedBanner: {
      backgroundColor: c.gold,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    cachedBannerText: { color: c.ink, textAlign: "center", fontWeight: "700", fontSize: 13 },
    errorRow: {
      marginHorizontal: spacing.lg,
      marginVertical: spacing.sm,
      padding: spacing.md,
      backgroundColor: c.dangerBg,
      borderRadius: radii.md,
    },
    errorText: { color: c.danger, fontSize: 13 },
    errorRetry: { color: c.leaf, fontWeight: "700", marginTop: 4, fontSize: 13 },
    saveSearchBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      marginHorizontal: spacing.lg,
      marginVertical: spacing.sm,
      paddingVertical: 8,
    },
    saveSearchText: { color: c.leaf, fontWeight: "600", fontSize: 13, fontFamily: fontFamily.semibold },
    locationHint: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.sm,
      color: c.muted,
      fontSize: 13,
      fontFamily: fontFamily.regular,
      lineHeight: 18,
    },
    mapPane: { flex: 1 },
    vList: { padding: spacing.lg, paddingBottom: 120, gap: spacing.lg },
    resultCount: { fontWeight: "700", color: c.forest, fontSize: 14, marginBottom: spacing.sm },
    loadingOverlay: { padding: spacing.lg },
    loadingHint: { textAlign: "center", color: c.muted, fontSize: 13, marginTop: spacing.sm },
    busyBar: { position: "absolute", top: 88, right: 16 },
  });
}
