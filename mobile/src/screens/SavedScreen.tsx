import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { CasaUser, Language, SavedSearchRow, ShortlistItem, CompareListingRow } from "../api/client";
import {
  compareShortlist,
  createSavedSearchAlert,
  deleteSavedSearch,
  getSavedSearches,
  getShortlist,
  removeShortlistItem,
} from "../api/client";
import CasaToast from "../components/CasaToast";
import EmptyState from "../components/EmptyState";
import ListingDetailModal from "../components/ListingDetailModal";
import NetworkBanner from "../components/NetworkBanner";
import ScreenHeader from "../components/ScreenHeader";
import ScreenLoader from "../components/ScreenLoader";
import ListingCard from "../components/ListingCard";
import { t } from "../i18n/strings";
import { colors, radii, spacing } from "../theme/casa";
import { ui } from "../theme/ui";
import { useCasaTheme } from "../theme/ThemeContext";

interface Props {
  token: string;
  user: CasaUser | null;
  uiLanguage: Language;
  lastSearchDescription?: string;
  onOpenMarket?: () => void;
  onShortlistChange?: () => void;
  onGoToSearch?: () => void;
  onUnlocked?: () => void;
  onNeedLogin?: () => void;
}

export default function SavedScreen({
  token,
  user,
  uiLanguage,
  lastSearchDescription,
  onShortlistChange,
  onGoToSearch,
  onUnlocked,
  onNeedLogin,
}: Props) {
  const lang = "en" as const;
  const m = t(lang);
  const { ui } = useCasaTheme();
  const [shortlist, setShortlist] = useState<ShortlistItem[]>([]);
  const [alerts, setAlerts] = useState<SavedSearchRow[]>([]);
  const [compareRows, setCompareRows] = useState<CompareListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const [s, a] = await Promise.all([
        getShortlist(token),
        getSavedSearches(token),
      ]);
      setShortlist(s.items);
      setAlerts(a.searches.filter((x) => x.active));
    } catch {
      /* keep partial data */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCompare() {
    if (shortlist.length < 2) {
      setToast(m.savedCompareNeed);
      setToastVisible(true);
      return;
    }
    try {
      const res = await compareShortlist(token);
      setCompareRows(res.listings);
    } catch (e) {
      setToast(e instanceof Error ? e.message : m.errorGeneric);
      setToastVisible(true);
    }
  }

  async function removeItem(houseId: string) {
    try {
      await removeShortlistItem(token, houseId);
      setShortlist((prev) => prev.filter((x) => x.houseId !== houseId));
      onShortlistChange?.();
      if (compareRows.length) setCompareRows([]);
    } catch (e) {
      setToast(e instanceof Error ? e.message : m.errorGeneric);
      setToastVisible(true);
    }
  }

  async function addAlertFromLastSearch() {
    if (!lastSearchDescription?.trim()) {
      onGoToSearch?.();
      return;
    }
    try {
      await createSavedSearchAlert(token, { description: lastSearchDescription, filters: {} });
      setToast(m.saveSearchDone);
      setToastVisible(true);
      void load();
    } catch (e) {
      setToast(e instanceof Error ? e.message : m.errorGeneric);
      setToastVisible(true);
    }
  }

  function showUnlockSuccess() {
    setToast(m.unlockSuccessHint);
    setToastVisible(true);
    onUnlocked?.();
  }

  return (
    <View style={ui.screen}>
      <NetworkBanner language={lang} />
      <ScreenHeader variant="quiet" title={m.savedTitleShort} />

      {loading ? (
        <ScreenLoader count={2} />
      ) : !token ? (
        <EmptyState
          icon="bookmark-outline"
          title={m.savedEmptyShortlist}
          subtitle={m.loginToContinue}
          actionLabel={m.accountLogin}
          onAction={onNeedLogin}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />
          }
        >
          <Text style={styles.section}>{m.savedShortlist}</Text>
          {shortlist.length === 0 ? (
            <EmptyState
              icon="bookmark-outline"
              title={m.savedEmptyShortlist}
              subtitle={m.savedEmptyShortlistHint}
              actionLabel={m.goToSearch}
              onAction={onGoToSearch}
            />
          ) : (
            shortlist.map((item) => (
              <View key={item.houseId} style={styles.shortlistRow}>
                <ListingCard
                  type={item.type}
                  location={item.location}
                  rentLabel={m.browseRent(item.rent)}
                  thumbUrl={item.thumbUrl}
                  language={lang}
                  bedroomCount={item.bedroomCount}
                  toiletCount={item.toiletCount}
                  monthsUpfront={item.monthsUpfront}
                  saved
                  onToggleSave={() => void removeItem(item.houseId)}
                  onPress={() => setDetailId(item.houseId)}
                  style={styles.listCard}
                />
              </View>
            ))
          )}
          {shortlist.length >= 2 ? (
            <Pressable style={styles.actionBtn} onPress={() => void onCompare()}>
              <Text style={styles.actionText}>{m.savedCompare}</Text>
            </Pressable>
          ) : null}
          {compareRows.length > 0 ? (
            <View style={styles.table}>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.tableHead, styles.tableName]} />
                <Text style={[styles.tableCell, styles.tableHead]}>{m.compareColRent}</Text>
                <Text style={[styles.tableCell, styles.tableHead]}>{m.compareColArea}</Text>
                <Text style={[styles.tableCell, styles.tableHead]}>{m.compareColBeds}</Text>
              </View>
              {compareRows.map((row) => (
                <View key={row.houseId} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.tableName]} numberOfLines={1}>
                    {row.type}
                  </Text>
                  <Text style={styles.tableCell}>{m.browseRent(row.rent)}</Text>
                  <Text style={styles.tableCell} numberOfLines={1}>
                    {row.location}
                  </Text>
                  <Text style={styles.tableCell}>{row.bedroomCount ?? "—"}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <Text style={styles.section}>{m.savedAlerts}</Text>
          {alerts.length === 0 ? (
            <EmptyState
              icon="notifications-outline"
              title={m.savedEmptyAlerts}
              subtitle={m.savedEmptyAlertsHint}
              actionLabel={lastSearchDescription ? m.savedAddAlert : m.goToSearch}
              onAction={() => (lastSearchDescription ? void addAlertFromLastSearch() : onGoToSearch?.())}
            />
          ) : (
            alerts.map((a) => (
              <View key={a.id} style={styles.card}>
                <Text style={styles.cardSub}>{a.description}</Text>
                <Pressable
                  style={styles.removeBtn}
                  onPress={() => void deleteSavedSearch(token, a.id).then(load)}
                >
                  <Text style={styles.removeText}>{m.savedRemove}</Text>
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <CasaToast
        message={toast}
        visible={toastVisible}
        onDismiss={() => {
          setToastVisible(false);
          setToast("");
        }}
        variant={toast.includes("✓") || toast === m.saveSearchDone || toast === m.unlockSuccessHint ? "success" : "info"}
      />

      <ListingDetailModal
        visible={Boolean(detailId)}
        houseId={detailId}
        token={token}
        user={user}
        uiLanguage={uiLanguage}
        onClose={() => setDetailId(null)}
        onUnlocked={() => {
          void load();
          showUnlockSuccess();
        }}
        onShortlistChange={() => {
          void load();
          onShortlistChange?.();
        }}
        onNeedLogin={onNeedLogin}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: 120 },
  section: { ...ui.sectionTitle, marginTop: spacing.lg },
  shortlistRow: { marginBottom: spacing.sm },
  listCard: { marginBottom: 0 },
  removeItemBtn: { alignSelf: "flex-end", marginTop: 4, paddingVertical: 4 },
  removeItemText: { color: colors.danger, fontWeight: "700", fontSize: 12 },
  compareRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  card: {
    ...ui.card,
    ...ui.cardPad,
    marginBottom: spacing.sm,
  },
  cardSub: { color: colors.muted, marginTop: 4, fontSize: 14, lineHeight: 20 },
  removeBtn: { alignSelf: "flex-start", marginTop: spacing.sm },
  removeText: { color: colors.danger, fontWeight: "700", fontSize: 13 },
  actionBtn: {
    backgroundColor: colors.leaf,
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  actionText: { color: colors.white, fontWeight: "600" },
  table: {
    marginTop: spacing.md,
    backgroundColor: colors.paper,
    borderRadius: radii.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.line,
  },
  tableRow: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  tableCell: { flex: 1, paddingVertical: 10, paddingHorizontal: 6, fontSize: 12, color: colors.ink },
  tableHead: { fontWeight: "700", color: colors.muted, fontSize: 11 },
  tableName: { flex: 1.2 },
  hint: { fontSize: 13, color: colors.mutedLight, marginBottom: spacing.sm },
  input: {
    ...ui.input,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: "row", gap: spacing.sm },
  half: { flex: 1 },
});
