import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View, Linking } from "react-native";
import type { CasaUser, Language } from "../api/client";
import { requestTenantVerification } from "../api/client";
import AccountActionRow from "../components/AccountActionRow";
import LandlordVerificationBadge from "../components/LandlordVerificationBadge";
import ScreenHeader from "../components/ScreenHeader";
import { t } from "../i18n/strings";
import { radii, spacing, type ColorTokens } from "../theme/casa";
import { screenInsets } from "../theme/insets";
import { useCasaTheme, type ThemeMode } from "../theme/ThemeContext";
import { loadInbox, markInboxRead, type InboxItem } from "../storage/notification-inbox";

export type FlowLaunch = "list" | "verify" | "extras" | null;

const DELETE_ACCOUNT_URL = "https://www.casahomesrwanda.com/delete-account";

interface Props {
  token: string;
  phone: string;
  user: CasaUser | null;
  uiLanguage: Language;
  onUserUpdate: (user: CasaUser | null, needsSignup: boolean) => void;
  onLanguageChange: (lang: Language) => void;
  onLogout: () => void;
  onLaunchFlow: (mode: Exclude<FlowLaunch, null>, title: string, extrasPick?: string) => void;
  lowDataMode?: boolean;
  onLowDataChange?: (enabled: boolean) => void;
  onOpenListing?: (houseId: string) => void;
  onOpenContacts?: () => void;
  contactCount?: number;
  onNeedLogin?: () => void;
}

export default function AccountScreen({
  token,
  phone,
  user,
  uiLanguage,
  onUserUpdate,
  onLanguageChange,
  onLogout,
  onLaunchFlow,
  lowDataMode = false,
  onLowDataChange,
  onOpenListing,
  onOpenContacts,
  contactCount = 0,
  onNeedLogin,
}: Props) {
  const lang = "en" as const;
  const m = t(lang);
  const isLandlord = user?.role === "landlord";
  const { colors, ui, mode, setMode } = useCasaTheme();
  const styles = useMemo(() => makeAccountStyles(colors), [colors]);
  const [inbox, setInbox] = useState<InboxItem[]>([]);

  const refreshInbox = useCallback(async () => {
    setInbox(await loadInbox());
  }, []);

  useEffect(() => {
    void refreshInbox();
  }, [refreshInbox]);

  async function openInboxItem(item: InboxItem) {
    await markInboxRead(item.id);
    void refreshInbox();
    if (item.houseId && onOpenListing && !isLandlord) {
      onOpenListing(item.houseId);
    }
  }

  return (
    <View style={ui.screen}>
      <ScreenHeader
        variant="quiet"
        title={m.tabAccount}
        subtitle={
          user
            ? `${user.display_name ?? phone} · ${isLandlord ? m.roleLandlord : m.roleTenant}`
            : m.guestAccountHint
        }
        right={
          isLandlord && user ? (
            <LandlordVerificationBadge verified={Boolean(user.landlordVerified)} language={lang} compact />
          ) : null
        }
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {!user || !token ? (
          <View style={styles.section}>
            <Text style={styles.helpBody}>{m.loginToContinue}</Text>
            <Pressable style={styles.toolBtn} onPress={onNeedLogin}>
              <Text style={styles.toolBtnText}>{m.accountLogin}</Text>
            </Pressable>
          </View>
        ) : (
        <>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{m.accountYou}</Text>
          {isLandlord && !user?.landlordVerified ? (
            <AccountActionRow
              icon="shield-checkmark-outline"
              label={m.verifyBannerCta}
              onPress={() => onLaunchFlow("verify", m.verifyBannerCta)}
            />
          ) : null}
          {isLandlord ? (
            <AccountActionRow
              icon="add-circle-outline"
              label={m.actionListProperty}
              onPress={() => onLaunchFlow("list", m.actionListProperty)}
              accent
            />
          ) : null}
          {!isLandlord && !user?.tenantVerified ? (
            <>
              <AccountActionRow
                icon="card-outline"
                label={m.tenantVerifyId}
                onPress={() => void requestTenantVerification(token, "id")}
              />
              <AccountActionRow
                icon="phone-portrait-outline"
                label={m.tenantVerifyMomo}
                onPress={() => void requestTenantVerification(token, "momo")}
              />
            </>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{m.accountActivity}</Text>
          {!isLandlord && onOpenContacts ? (
            <AccountActionRow
              icon="people-outline"
              label={contactCount > 0 ? `${m.yourLandlords} (${contactCount})` : m.yourLandlords}
              onPress={onOpenContacts}
            />
          ) : null}
          {inbox.length === 0 ? (
            <Text style={styles.helpBody}>{m.notificationEmptyLine}</Text>
          ) : (
            inbox.slice(0, 8).map((item) => (
              <Pressable
                key={item.id}
                style={[styles.inboxRow, !item.read && styles.inboxUnread]}
                onPress={() => void openInboxItem(item)}
              >
                <Text style={styles.inboxTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.inboxBody} numberOfLines={2}>
                  {item.body}
                </Text>
              </Pressable>
            ))
          )}
        </View>
        </>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{m.accountSettings}</Text>
          <Text style={styles.toolHead}>{m.themeTitle}</Text>
          <View style={styles.themeRow}>
            {([
              { id: "light" as ThemeMode, label: m.themeLight },
              { id: "dark" as ThemeMode, label: m.themeDark },
              { id: "system" as ThemeMode, label: m.themeSystem },
            ]).map((opt) => (
              <Pressable
                key={opt.id}
                style={[styles.themeChip, mode === opt.id && styles.themeChipOn]}
                onPress={() => setMode(opt.id)}
              >
                <Text style={[styles.themeChipText, mode === opt.id && styles.themeChipTextOn]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.toolHead, { marginTop: spacing.md }]}>{m.lowDataMode}</Text>
          <Text style={styles.helpBody}>{m.lowDataHint}</Text>
          <View style={styles.toggleRow}>
            <Switch value={lowDataMode} onValueChange={onLowDataChange} trackColor={{ true: colors.leaf }} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{m.helpTitle}</Text>
          <Text style={styles.helpBody}>{m.helpBody}</Text>
        </View>

        {user && token ? (
          <>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{m.deleteAccountTitle}</Text>
          <Text style={styles.helpBody}>{m.deleteAccountBody}</Text>
          <Pressable style={styles.deleteLinkBtn} onPress={() => void Linking.openURL(DELETE_ACCOUNT_URL)}>
            <Text style={styles.deleteLinkText}>{m.deleteAccountLink}</Text>
          </Pressable>
        </View>

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
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function makeAccountStyles(c: ColorTokens) {
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
    themeRow: { flexDirection: "row", gap: 8 },
    themeChip: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: radii.md,
      backgroundColor: c.paper2,
      alignItems: "center",
    },
    themeChipOn: { backgroundColor: c.leaf },
    themeChipText: { fontSize: 13, fontWeight: "600", color: c.muted },
    themeChipTextOn: { color: c.onDark },
    inboxRow: {
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.line,
    },
    inboxUnread: { backgroundColor: c.paper2, marginHorizontal: -4, paddingHorizontal: 4, borderRadius: radii.sm },
    inboxTitle: { fontSize: 14, fontWeight: "800", color: c.forest },
    inboxBody: { fontSize: 13, color: c.muted, marginTop: 2, lineHeight: 18 },
    toggleRow: { marginTop: spacing.sm },
    helpBody: { fontSize: 14, color: c.muted, lineHeight: 21 },
    deleteLinkBtn: { marginTop: spacing.md },
    deleteLinkText: { color: c.leaf, fontWeight: "700", fontSize: 15 },
    logoutBtn: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.xl,
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
    toolBtn: {
      backgroundColor: c.leaf,
      borderRadius: radii.md,
      paddingVertical: 12,
      alignItems: "center",
      marginTop: spacing.sm,
      marginBottom: spacing.md,
    },
    toolBtnText: { color: c.onDark, fontWeight: "700" },
    toolHead: { fontSize: 13, fontWeight: "700", color: c.inkSoft, marginBottom: 8, marginTop: 8 },
  });
}
