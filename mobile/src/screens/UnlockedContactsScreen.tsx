import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { CasaUser, Language, UnlockedContact } from "../api/client";
import { getUnlockedContacts } from "../api/client";
import EmptyState from "../components/EmptyState";
import ListingDetailModal from "../components/ListingDetailModal";
import NetworkBanner from "../components/NetworkBanner";
import ScreenHeader from "../components/ScreenHeader";
import ScreenLoader from "../components/ScreenLoader";
import { t } from "../i18n/strings";
import { colors, radii, spacing } from "../theme/casa";
import { useCasaTheme } from "../theme/ThemeContext";
import { callPhone, openWhatsApp } from "../utils/contact";

interface Props {
  token: string;
  user: CasaUser | null;
  uiLanguage: Language;
  onGoToSearch?: () => void;
  onNeedLogin?: () => void;
}

export default function UnlockedContactsScreen({ token, user, uiLanguage, onGoToSearch, onNeedLogin }: Props) {
  const lang = "en" as const;
  const m = t(lang);
  const { ui } = useCasaTheme();
  const [contacts, setContacts] = useState<UnlockedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setContacts([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await getUnlockedContacts(token);
      setContacts(res.contacts);
    } catch (e) {
      setError(e instanceof Error ? e.message : m.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, [m.errorGeneric, token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View style={ui.screen}>
      <NetworkBanner language={lang} />
      <ScreenHeader variant="quiet" title={m.tabContacts} subtitle={m.contactsSubtitle} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ScreenLoader count={2} />
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => `${item.houseId}-${item.unlockedAt}`}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title={m.contactsEmpty}
              subtitle={token ? m.contactsEmptyHint : m.loginToContinue}
              actionLabel={token ? m.goToSearch : m.accountLogin}
              onAction={token ? onGoToSearch : onNeedLogin}
            />
          }
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => setDetailId(item.houseId)}>
              <Text style={styles.houseId}>{item.neighbourhood || m.yourLandlords}</Text>
              {item.neighbourhood ? (
                <Text style={styles.loc}>{item.neighbourhood}</Text>
              ) : null}
              <Text style={styles.rent}>{m.browseRent(item.rent)}</Text>
              <View style={styles.row}>
                <Pressable style={styles.callBtn} onPress={() => callPhone(item.landlordPhone)}>
                  <Ionicons name="call" size={16} color={colors.white} />
                  <Text style={styles.btnText}>{m.detailCall}</Text>
                </Pressable>
                <Pressable
                  style={styles.waBtn}
                  onPress={() =>
                    openWhatsApp(
                      item.landlordPhone,
                      lang === "fr"
                        ? `Bonjour, concernant ${item.neighbourhood ?? "Casa"} sur Casa.`
                        : `Hello, regarding ${item.neighbourhood ?? "Casa"} on Casa.`
                    )
                  }
                >
                  <Ionicons name="logo-whatsapp" size={16} color={colors.white} />
                  <Text style={styles.btnText}>{m.detailWhatsApp}</Text>
                </Pressable>
              </View>
              <Pressable style={styles.viewBtn} onPress={() => setDetailId(item.houseId)}>
                <Text style={styles.viewBtnText}>{m.detailViewListing}</Text>
              </Pressable>
            </Pressable>
          )}
        />
      )}

      <ListingDetailModal
        visible={Boolean(detailId)}
        houseId={detailId}
        token={token}
        user={user}
        uiLanguage={uiLanguage}
        onClose={() => setDetailId(null)}
        onNeedLogin={onNeedLogin}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger, padding: spacing.md },
  list: { padding: spacing.lg, paddingBottom: 100 },
  empty: { textAlign: "center", color: colors.muted, marginTop: spacing.xxl, fontSize: 15 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  houseId: { fontWeight: "600", color: colors.ink, fontSize: 15 },
  loc: { color: colors.muted, marginTop: 4 },
  rent: { color: colors.leaf, fontWeight: "700", marginTop: 6 },
  row: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  callBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.leaf,
    borderRadius: radii.md,
    paddingVertical: 12,
  },
  waBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.wa,
    borderRadius: radii.md,
    paddingVertical: 12,
  },
  btnText: { color: colors.white, fontWeight: "600", fontSize: 13 },
  viewBtn: {
    marginTop: 10,
    borderRadius: radii.md,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.leaf,
  },
  viewBtnText: { color: colors.leaf, fontWeight: "700", fontSize: 13 },
});
