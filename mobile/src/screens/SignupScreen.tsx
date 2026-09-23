import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { CasaUser, Language, UserRole } from "../api/client";
import { registerAccount } from "../api/client";
import CasaButton from "../components/CasaButton";
import CasaLogo from "../components/CasaLogo";
import { t } from "../i18n/strings";
import { radii, spacing, type ColorTokens } from "../theme/casa";
import { screenInsets } from "../theme/insets";
import { useCasaTheme } from "../theme/ThemeContext";

interface Props {
  token: string;
  uiLanguage: Language;
  onComplete: (user: CasaUser) => void;
  onLanguageChange: (lang: Language) => void;
}

export default function SignupScreen({ token, onComplete }: Props) {
  const m = t("en");
  const { colors, gradient } = useCasaTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [referral, setReferral] = useState("");
  const [showReferral, setShowReferral] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<UserRole | null>(null);

  async function confirmRole() {
    if (!picked) return;
    setBusy(true);
    setError("");
    try {
      const res = await registerAccount(token, {
        role: picked,
        language: "en",
        referrer: referral.replace(/\D/g, "") || undefined,
      });
      onComplete(res.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : m.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={[...gradient.header]} style={[styles.header, { paddingTop: screenInsets().top }]}>
        <View>
          <View style={styles.headerRow}>
            <CasaLogo width={168} />
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{m.signupTitle}</Text>
          <Text style={styles.sub}>{m.signupSubtitle}</Text>
          <Text style={styles.roleHint}>{m.signupRoleHint}</Text>

          <Pressable
            style={[styles.roleBtn, picked === "tenant" && styles.roleBtnOn, busy && styles.disabled]}
            disabled={busy}
            onPress={() => setPicked("tenant")}
          >
            <View style={[styles.roleIconWrap, styles.roleIconTenant]}>
              <Ionicons name="search" size={26} color={colors.leaf} />
            </View>
            <View style={styles.roleBody}>
              <Text style={styles.roleTitle}>{m.roleTenant}</Text>
              <Text style={styles.roleDesc}>{m.signupTenantDesc}</Text>
            </View>
            {picked === "tenant" ? <Ionicons name="checkmark-circle" size={22} color={colors.leaf} /> : null}
          </Pressable>

          <Pressable
            style={[styles.roleBtn, picked === "landlord" && styles.roleBtnOn, busy && styles.disabled]}
            disabled={busy}
            onPress={() => setPicked("landlord")}
          >
            <View style={[styles.roleIconWrap, styles.roleIconLandlord]}>
              <Ionicons name="home" size={26} color={colors.leaf} />
            </View>
            <View style={styles.roleBody}>
              <Text style={styles.roleTitle}>{m.roleLandlord}</Text>
              <Text style={styles.roleDesc}>{m.signupLandlordDesc}</Text>
            </View>
            {picked === "landlord" ? <Ionicons name="checkmark-circle" size={22} color={colors.leaf} /> : null}
          </Pressable>

          {picked ? (
            <CasaButton
              label={picked === "tenant" ? m.signupConfirmTenant : m.signupConfirmLandlord}
              onPress={() => void confirmRole()}
              loading={busy}
              style={{ marginTop: spacing.md }}
            />
          ) : null}

          <Pressable onPress={() => setShowReferral((v) => !v)}>
            <Text style={styles.referralLink}>{m.signupReferralToggle}</Text>
          </Pressable>

          {showReferral ? (
            <>
              <Text style={styles.label}>{m.signupReferralLabel}</Text>
              <TextInput
                style={styles.input}
                value={referral}
                onChangeText={setReferral}
                keyboardType="phone-pad"
                placeholder="250…"
                placeholderTextColor={colors.mutedLight}
              />
            </>
          ) : null}

          {busy ? <Text style={styles.busyHint}>{m.flowWorking}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.paper2 },
    flex: { flex: 1 },
    header: {
      paddingBottom: spacing.xl,
      paddingHorizontal: spacing.xl,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    sheet: {
      flex: 1,
      backgroundColor: c.paper,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      marginTop: -12,
      padding: spacing.xl,
    },
    title: { fontSize: 24, fontWeight: "700", color: c.forest },
    sub: { fontSize: 15, color: c.muted, marginTop: spacing.sm, marginBottom: spacing.sm, lineHeight: 22 },
    roleHint: { fontSize: 13, color: c.mutedLight, marginBottom: spacing.xl, lineHeight: 19 },
    roleBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.paper2,
      borderRadius: radii.lg,
      padding: spacing.lg,
      marginBottom: spacing.md,
      borderWidth: 2,
      borderColor: "transparent",
    },
    roleBtnOn: { borderColor: c.leaf, backgroundColor: c.successBg },
    disabled: { opacity: 0.6 },
    roleIconWrap: {
      width: 52,
      height: 52,
      borderRadius: radii.md,
      alignItems: "center",
      justifyContent: "center",
      marginRight: spacing.md,
    },
    roleIconTenant: { backgroundColor: c.whatsappLight },
    roleIconLandlord: { backgroundColor: c.successBg },
    roleBody: { flex: 1 },
    roleTitle: { fontSize: 18, fontWeight: "800", color: c.forest },
    roleDesc: { fontSize: 13, color: c.muted, marginTop: 4, lineHeight: 18 },
    referralLink: { color: c.leaf, fontWeight: "700", marginTop: spacing.sm, marginBottom: spacing.sm },
    label: { fontSize: 13, fontWeight: "600", color: c.inkSoft, marginBottom: 6 },
    input: {
      backgroundColor: c.paper2,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.lineStrong,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontSize: 16,
      color: c.ink,
    },
    error: { color: c.danger, marginTop: spacing.md },
    busyHint: { color: c.muted, textAlign: "center", marginTop: spacing.lg, fontSize: 14 },
  });
}
