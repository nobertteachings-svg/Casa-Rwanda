import { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import type { CasaUser, Language, LandlordInterestItem } from "../api/client";
import { getLandlordInterest } from "../api/client";
import EmptyState from "../components/EmptyState";
import NetworkBanner from "../components/NetworkBanner";
import ScreenHeader from "../components/ScreenHeader";
import ScreenLoader from "../components/ScreenLoader";
import { t } from "../i18n/strings";
import { radii, spacing, type ColorTokens } from "../theme/casa";
import { fontFamily } from "../theme/fonts";
import { useCasaTheme } from "../theme/ThemeContext";

interface Props {
  token: string;
  user: CasaUser | null;
  uiLanguage: Language;
}

export default function LandlordInterestScreen({ token, user, uiLanguage }: Props) {
  const lang = "en" as const;
  const m = t(lang);
  const { colors, ui } = useCasaTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [items, setItems] = useState<LandlordInterestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getLandlordInterest(token);
      setItems(res.items);
    } catch {
      /* keep */
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View style={ui.screen}>
      <NetworkBanner language={lang} />
      <ScreenHeader variant="quiet" title={m.tabInterest} />

      {loading ? (
        <ScreenLoader count={2} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
            />
          }
        >
          {items.length === 0 ? (
            <EmptyState icon="people-outline" title={m.interestEmpty} subtitle={m.interestEmptyHint} />
          ) : (
            items.map((row) => (
              <Pressable
                key={row.id}
                style={styles.card}
                onPress={() => {
                  const digits = row.tenantPhone.replace(/\D/g, "");
                  void Linking.openURL(`https://wa.me/${digits}`);
                }}
              >
                <Text style={styles.loc}>{row.location || row.houseId}</Text>
                <Text style={styles.rent}>{m.browseRent(row.rent)}</Text>
                <Text style={styles.meta}>{row.tenantPhone}</Text>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    scroll: { padding: spacing.lg, paddingBottom: 120 },
    card: {
      backgroundColor: c.paper,
      borderRadius: radii.lg,
      padding: spacing.lg,
      marginBottom: spacing.md,
    },
    loc: { fontSize: 16, fontWeight: "600", color: c.ink, fontFamily: fontFamily.semibold },
    rent: { fontSize: 14, fontWeight: "700", color: c.leaf, marginTop: 4, fontFamily: fontFamily.bold },
    meta: { fontSize: 13, color: c.muted, marginTop: 6, fontFamily: fontFamily.regular },
  });
}
