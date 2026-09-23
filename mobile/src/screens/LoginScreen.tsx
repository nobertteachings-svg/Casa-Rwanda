import { useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { requestLoginCode, verifyLoginCode, bootstrapSession } from "../api/client";
import { saveAuth } from "../storage/auth";
import type { CasaUser, Language } from "../api/client";
import { loginT } from "../i18n/strings";
import CasaButton from "../components/CasaButton";
import CasaLogo from "../components/CasaLogo";
import { fontFamily } from "../theme/fonts";
import { radii, spacing, type ColorTokens } from "../theme/casa";
import { screenInsets } from "../theme/insets";
import { useCasaTheme } from "../theme/ThemeContext";

const WHATSAPP_SIGNUP = "https://wa.me/250700000000?text=Hi%20Casa!%20I%20want%20to%20sign%20up.";
const OTP_LEN = 6;

interface Props {
  onLoggedIn: (
    token: string,
    user: CasaUser | null,
    needsSignup: boolean,
    phone: string,
    language: Language
  ) => void;
  onDismiss?: () => void;
}

export default function LoginScreen({ onLoggedIn, onDismiss }: Props) {
  const { colors, gradient } = useCasaTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const m = loginT(false);
  const [phone, setPhone] = useState("250");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState(WHATSAPP_SIGNUP);
  const [needWhatsAppTap, setNeedWhatsAppTap] = useState(false);
  const otpRefs = useRef<Array<TextInput | null>>([]);

  async function sendCode() {
    setBusy(true);
    setError("");
    setHint("");
    try {
      const lang = "en" as const;
      const res = await requestLoginCode(phone, lang);
      if (res.delivery === "existing_user" && res.token) {
        const normalized = phone.replace(/\D/g, "");
        await saveAuth(res.token, normalized);
        await bootstrapSession(res.token, lang);
        onLoggedIn(res.token, res.user ?? null, res.needsSignup ?? false, normalized, lang);
        return;
      }
      const mins = Math.round(res.expiresIn / 60);
      const clickPath = res.delivery === "whatsapp_click" || Boolean(res.whatsappUrl && res.delivery !== "review_bypass" && res.delivery !== "whatsapp_template");
      setStep("code");
      setCode("");
      setWhatsappUrl(res.whatsappUrl || WHATSAPP_SIGNUP);
      setNeedWhatsAppTap(clickPath);
      setHint(clickPath ? m.codeHintClick(mins) : m.codeHint(phone, mins));
      if (clickPath && res.whatsappUrl) {
        void Linking.openURL(res.whatsappUrl);
      }
      setTimeout(() => otpRefs.current[0]?.focus(), 200);
    } catch (e) {
      setError(e instanceof Error ? e.message : m.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  async function verifyWith(codeValue: string) {
    if (codeValue.length < OTP_LEN || busy) return;
    setBusy(true);
    setError("");
    try {
      const normalized = phone.replace(/\D/g, "");
      const lang = "en" as const;
      const res = await verifyLoginCode(phone, codeValue);
      await saveAuth(res.token, normalized);
      await bootstrapSession(res.token, lang);
      onLoggedIn(res.token, res.user, res.needsSignup, normalized, lang);
    } catch (e) {
      setError(e instanceof Error ? e.message : m.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  function setOtpDigit(index: number, raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (digits.length > 1) {
      const next = digits.slice(0, OTP_LEN);
      setCode(next);
      const focusAt = Math.min(next.length, OTP_LEN - 1);
      otpRefs.current[focusAt]?.focus();
      if (next.length === OTP_LEN) void verifyWith(next);
      return;
    }
    const chars = code.padEnd(OTP_LEN, " ").split("");
    chars[index] = digits.slice(-1) || " ";
    const next = chars.join("").replace(/ /g, "").slice(0, OTP_LEN);
    setCode(next);
    if (digits && index < OTP_LEN - 1) otpRefs.current[index + 1]?.focus();
    if (next.length === OTP_LEN) void verifyWith(next);
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={[...gradient.header]} style={[styles.top, { paddingTop: screenInsets().top }]}>
        <View>
          <View style={styles.langRow}>
            {onDismiss ? (
              <Pressable onPress={onDismiss} hitSlop={12}>
                <Text style={styles.skip}>{m.loginContinueBrowse}</Text>
              </Pressable>
            ) : (
              <View />
            )}
          </View>
          <View style={styles.hero}>
            <CasaLogo width={200} />
            <Text style={styles.tagline}>{m.loginSubtitle}</Text>
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.card}>
          {step === "phone" ? (
            <>
              <Text style={styles.label}>{m.phoneLabel}</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="250700000000"
                placeholderTextColor={colors.mutedLight}
              />
              <Text style={styles.note}>{m.phoneNote}</Text>
              <CasaButton
                label={m.sendCode}
                onPress={() => void sendCode()}
                loading={busy}
                disabled={phone.replace(/\D/g, "").length < 8}
              />
            </>
          ) : (
            <>
              {hint ? <Text style={styles.hint}>{hint}</Text> : null}
              <Text style={styles.label}>{m.codeLabel}</Text>
              <View style={styles.otpRow}>
                {Array.from({ length: OTP_LEN }).map((_, i) => (
                  <TextInput
                    key={i}
                    ref={(el) => {
                      otpRefs.current[i] = el;
                    }}
                    style={styles.otpBox}
                    value={code[i] ?? ""}
                    onChangeText={(v) => setOtpDigit(i, v)}
                    onKeyPress={({ nativeEvent }) => {
                      if (nativeEvent.key === "Backspace" && !code[i] && i > 0) {
                        otpRefs.current[i - 1]?.focus();
                        setCode((prev) => prev.slice(0, i - 1));
                      }
                    }}
                    keyboardType="number-pad"
                    maxLength={i === 0 ? OTP_LEN : 1}
                    textContentType="oneTimeCode"
                    autoComplete="one-time-code"
                  />
                ))}
              </View>
              {needWhatsAppTap ? (
                <CasaButton
                  variant="wa"
                  label={m.openWhatsAppForCode}
                  onPress={() => void Linking.openURL(whatsappUrl)}
                  loading={false}
                  style={{ marginBottom: spacing.md }}
                />
              ) : null}
              <CasaButton
                label={m.continue}
                onPress={() => void verifyWith(code)}
                loading={busy}
                disabled={code.length < OTP_LEN}
              />
              <Pressable onPress={() => setStep("phone")} style={styles.linkWrap}>
                <Text style={styles.link}>{m.changeNumber}</Text>
              </Pressable>
            </>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {error ? <Text style={styles.firstTimeHint}>{m.loginCodeFailedHint}</Text> : null}

          <View style={styles.signupBox}>
            <Text style={styles.signupHint}>{m.signupHint}</Text>
            <Pressable onPress={() => void Linking.openURL(WHATSAPP_SIGNUP)}>
              <Text style={styles.signupLink}>{m.openWhatsApp}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.paper2 },
    top: { paddingBottom: spacing.xl },
    flex: { flex: 1, paddingHorizontal: spacing.lg, marginTop: -20 },
    langRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
    },
    skip: { color: c.onDark, fontSize: 13, fontFamily: fontFamily.medium, maxWidth: 200 },
    hero: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md },
    tagline: {
      fontSize: 16,
      color: c.onDarkMuted,
      marginTop: spacing.sm,
      lineHeight: 24,
      maxWidth: 320,
      fontFamily: fontFamily.regular,
    },
    card: {
      backgroundColor: c.paper,
      borderRadius: radii.lg,
      padding: spacing.xl,
    },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: c.inkSoft,
      marginBottom: spacing.sm,
      fontFamily: fontFamily.semibold,
    },
    input: {
      backgroundColor: c.paper2,
      borderWidth: 1,
      borderColor: c.lineStrong,
      borderRadius: radii.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: 14,
      fontSize: 17,
      marginBottom: spacing.md,
      color: c.ink,
      fontFamily: fontFamily.regular,
    },
    otpRow: { flexDirection: "row", gap: 8, marginBottom: spacing.lg },
    otpBox: {
      flex: 1,
      height: 52,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.lineStrong,
      backgroundColor: c.paper2,
      textAlign: "center",
      fontSize: 22,
      fontWeight: "700",
      color: c.ink,
      fontFamily: fontFamily.bold,
    },
    note: {
      fontSize: 13,
      color: c.muted,
      marginBottom: spacing.sm,
      lineHeight: 19,
      fontFamily: fontFamily.regular,
    },
    firstTimeHint: {
      fontSize: 12,
      color: c.muted,
      marginBottom: spacing.lg,
      lineHeight: 18,
      fontFamily: fontFamily.regular,
    },
    hint: {
      fontSize: 13,
      color: c.leaf,
      marginBottom: spacing.lg,
      lineHeight: 19,
      fontWeight: "600",
      fontFamily: fontFamily.semibold,
    },
    linkWrap: { marginTop: spacing.lg, alignItems: "center" },
    link: { color: c.leaf, fontSize: 14, fontWeight: "600", fontFamily: fontFamily.semibold },
    error: { marginTop: spacing.lg, color: c.danger, fontSize: 14, lineHeight: 20, fontFamily: fontFamily.medium },
    signupBox: {
      marginTop: spacing.xl,
      paddingTop: spacing.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.line,
    },
    signupHint: { fontSize: 13, color: c.muted, marginBottom: 6, fontFamily: fontFamily.regular },
    signupLink: { fontSize: 14, color: c.wa, fontWeight: "700", fontFamily: fontFamily.bold },
  });
}
