import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import type { CasaUser, Language } from "../api/client";
import { getReferralInvite, requestTenantVerification, setDiasporaBeneficiary } from "../api/client";
import AccountActionRow from "../components/AccountActionRow";
import ScreenHeader from "../components/ScreenHeader";
import { t } from "../i18n/strings";
import { radii, spacing, type ColorTokens } from "../theme/casa";
import { screenInsets } from "../theme/insets";
import { useCasaTheme } from "../theme/ThemeContext";
import type { FlowLaunch } from "./AccountScreen";

interface Props {
  token: string;
  user: CasaUser | null;
  uiLanguage: Language;
  onLaunchFlow: (mode: Exclude<FlowLaunch, null>, title: string, extrasPick?: string) => void;
  onNeedLogin?: () => void;
  onLogout?: () => void;
}

export default function MenuScreen({
  token,
  user,
  uiLanguage,
  onLaunchFlow,
  onNeedLogin,
  onLogout,
}: Props) {
  const lang = "en" as const;
  const m = t(lang);
  const isLandlord = user?.role === "landlord";
  const { colors, ui } = useCasaTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [diasporaPhone, setDiasporaPhone] = useState(user?.beneficiaryPhone ?? "");
  const [showDiaspora, setShowDiaspora] = useState(false);
  const loggedIn = Boolean(user && token);

  function requireLogin(then: () => void) {
    if (!loggedIn) {
      onNeedLogin?.();
      return;
    }
    then();
  }

  function openExtras(title: string, pick?: string) {
    requireLogin(() => onLaunchFlow("extras", title, pick));
  }

  function shareInvite() {
    requireLogin(() => {
      void getReferralInvite(token)
        .then((res) => Share.share({ message: res.message }))
        .catch((e) => Alert.alert(m.errorGeneric, e instanceof Error ? e.message : ""));
    });
  }

  return (
    <View style={ui.screen}>
      <ScreenHeader
        variant="quiet"
        title={m.tabMenu}
        subtitle={isLandlord ? m.welcomeLandlord : m.welcomeTenant}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        {!loggedIn ? (
          <View style={styles.section}>
            <Text style={styles.helpBody}>{m.loginToContinue}</Text>
            <Pressable style={styles.toolBtn} onPress={onNeedLogin}>
              <Text style={styles.toolBtnText}>{m.accountLogin}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{m.actionMoreOptions}</Text>
          <AccountActionRow
            icon="grid-outline"
            label={m.menu}
            onPress={() => openExtras(m.actionMoreOptions)}
            accent
          />

          {isLandlord ? (
            <>
              <AccountActionRow
                icon="stats-chart-outline"
                label={m.landlordStatsTitle}
                onPress={() => openExtras(m.landlordStatsTitle, "1")}
              />
              <AccountActionRow
                icon="document-text-outline"
                label={m.landlordGenerateLease}
                onPress={() => openExtras(m.landlordGenerateLease, "2")}
              />
              <AccountActionRow
                icon="layers-outline"
                label={m.menuBulkManage}
                onPress={() => openExtras(m.menuBulkManage, "3")}
              />
              <AccountActionRow icon="gift-outline" label={m.referTitle} onPress={shareInvite} />
              <AccountActionRow
                icon="briefcase-outline"
                label={m.menuAgent}
                onPress={() => openExtras(m.menuAgent, "5")}
              />
              <AccountActionRow
                icon="trending-up-outline"
                label={m.marketTrendsTitle}
                onPress={() => openExtras(m.marketTrendsTitle, "6")}
              />
              <AccountActionRow
                icon="shield-checkmark-outline"
                label={m.verifyBannerCta}
                onPress={() => requireLogin(() => onLaunchFlow("verify", m.verifyBannerCta))}
              />
            </>
          ) : (
            <>
              <AccountActionRow
                icon="notifications-outline"
                label={m.saveSearch}
                onPress={() => openExtras(m.saveSearch, "1")}
              />
              <AccountActionRow
                icon="git-compare-outline"
                label={m.savedAiCompare}
                onPress={() => openExtras(m.savedAiCompare, "2")}
              />
              <AccountActionRow
                icon="globe-outline"
                label={m.diasporaTitle}
                onPress={() => requireLogin(() => setShowDiaspora((v) => !v))}
              />
              {showDiaspora && loggedIn ? (
                <>
                  <Text style={styles.helpBody}>{m.diasporaHint}</Text>
                  <TextInput
                    style={styles.input}
                    value={diasporaPhone}
                    onChangeText={setDiasporaPhone}
                    keyboardType="phone-pad"
                    placeholder="250…"
                    placeholderTextColor={colors.mutedLight}
                  />
                  <Pressable
                    style={styles.toolBtn}
                    onPress={() =>
                      void setDiasporaBeneficiary(token, diasporaPhone)
                        .then(() => Alert.alert(m.diasporaTitle, m.languageUpdated))
                        .catch((e) => Alert.alert(m.errorGeneric, e instanceof Error ? e.message : ""))
                    }
                  >
                    <Text style={styles.toolBtnText}>{m.diasporaSave}</Text>
                  </Pressable>
                </>
              ) : null}
              <AccountActionRow
                icon="card-outline"
                label={m.tenantVerifyId}
                onPress={() =>
                  requireLogin(() =>
                    void requestTenantVerification(token, "id")
                      .then(() => Alert.alert(m.tenantVerifyTitle, m.menuVerifyRequested))
                      .catch((e) => Alert.alert(m.errorGeneric, e instanceof Error ? e.message : ""))
                  )
                }
              />
              <AccountActionRow
                icon="phone-portrait-outline"
                label={m.tenantVerifyMomo}
                onPress={() =>
                  requireLogin(() =>
                    void requestTenantVerification(token, "momo")
                      .then(() => Alert.alert(m.tenantVerifyTitle, m.menuVerifyRequested))
                      .catch((e) => Alert.alert(m.errorGeneric, e instanceof Error ? e.message : ""))
                  )
                }
              />
              <AccountActionRow icon="gift-outline" label={m.referTitle} onPress={shareInvite} />
              <AccountActionRow
                icon="map-outline"
                label={m.marketTitle}
                onPress={() => openExtras(m.marketTitle, "6")}
              />
            </>
          )}
        </View>

        {loggedIn && onLogout ? (
          <Pressable
            style={styles.logoutBtn}
            onPress={() =>
              Alert.alert(m.logout, m.logoutConfirm, [
                { text: m.detailClose, style: "cancel" },
                { text: m.logout, style: "destructive", onPress: onLogout },
              ])
            }
            accessibilityRole="button"
            accessibilityLabel={m.logout}
          >
            <Text style={styles.logoutText}>{m.logout}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    scroll: { paddingBottom: 120 + screenInsets().bottom, paddingTop: spacing.sm },
    section: {
      marginTop: spacing.md,
      marginHorizontal: spacing.lg,
      backgroundColor: c.paper,
      borderRadius: radii.lg,
      padding: spacing.lg,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: c.muted,
      marginBottom: spacing.md,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    helpBody: { fontSize: 14, color: c.muted, lineHeight: 21, marginBottom: spacing.sm },
    input: {
      backgroundColor: c.paper2,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.lineStrong,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 16,
      color: c.ink,
      marginTop: spacing.sm,
    },
    toolBtn: {
      backgroundColor: c.leaf,
      borderRadius: radii.md,
      paddingVertical: 12,
      alignItems: "center",
      marginTop: spacing.sm,
      marginBottom: spacing.md,
    },
    toolBtnText: { color: c.onDark, fontWeight: "700" },
    logoutBtn: {
      marginTop: spacing.xl,
      marginHorizontal: spacing.lg,
      minHeight: 52,
      borderRadius: radii.md,
      borderWidth: 1.5,
      borderColor: c.danger,
      backgroundColor: c.dangerBg,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
    },
    logoutText: { color: c.danger, fontWeight: "800", fontSize: 16 },
  });
}
