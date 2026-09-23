import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import type { CasaUser, ConciergeContent, Language, ListingDetail, UnlockQuote } from "../api/client";
import { getUnlockQuote, unlockListing } from "../api/client";
import { t } from "../i18n/strings";
import { hapticSuccess } from "../utils/haptics";
import { maybeRequestReviewAfterFirstUnlock } from "../utils/store-review";
import { callPhone, openWhatsApp } from "../utils/contact";
import CachedImage from "./CachedImage";
import { radii, spacing, type ColorTokens } from "../theme/casa";
import { fontFamily } from "../theme/fonts";
import { useCasaTheme } from "../theme/ThemeContext";

interface Props {
  visible: boolean;
  houseId: string | null;
  token: string;
  user: CasaUser | null;
  uiLanguage: Language;
  preview?: { thumbUrl?: string; location: string; rentLabel: string };
  onClose: () => void;
  onUnlocked: (listing: ListingDetail, concierge?: ConciergeContent) => void;
}

export default function UnlockSheet({
  visible,
  houseId,
  token,
  user,
  uiLanguage,
  preview,
  onClose,
  onUnlocked,
}: Props) {
  const lang = uiLanguage;
  const m = t(lang);
  const { colors } = useCasaTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [quote, setQuote] = useState<UnlockQuote | null>(null);
  const [instructions, setInstructions] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [unlockedListing, setUnlockedListing] = useState<ListingDetail | null>(null);

  const loadQuote = useCallback(async () => {
    if (!houseId) return;
    setLoading(true);
    setError("");
    try {
      const res = await getUnlockQuote(token, houseId);
      setQuote(res.quote);
      setInstructions(res.paymentInstructions);
    } catch (e) {
      setError(e instanceof Error ? e.message : m.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, [houseId, m.errorGeneric, token]);

  useEffect(() => {
    if (visible && houseId) void loadQuote();
    if (!visible) {
      setQuote(null);
      setInstructions(null);
      setError("");
      setCopied(false);
      setUnlockedListing(null);
    }
  }, [visible, houseId, loadQuote]);

  async function tryUnlock(confirmPaid = false) {
    if (!houseId) return;
    setBusy(true);
    setError("");
    try {
      const res = await unlockListing(token, houseId, { confirmPaid });
      if (res.ok && res.unlocked && res.listing) {
        hapticSuccess();
        void maybeRequestReviewAfterFirstUnlock();
        setUnlockedListing(res.listing);
        onUnlocked(res.listing, res.concierge);
        return;
      }
      if (!res.ok && !res.unlocked) {
        if ("quote" in res && res.quote) {
          setQuote(res.quote);
          setInstructions(res.paymentInstructions ?? null);
        }
        if (res.reason === "limit") {
          setError(m.unlockLimitReached);
        } else if (res.reason === "payment_required") {
          setError(m.unlockPaymentRequired);
        }
        return;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : m.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  async function copyReference() {
    if (!quote) return;
    await Clipboard.setStringAsync(quote.reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const paymentsOn = quote?.paymentsEnabled ?? user?.paymentsEnabled ?? false;
  const instant = quote?.canUnlockInstantly ?? !paymentsOn;
  const phone = unlockedListing?.landlordPhone;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>{m.unlockSheetTitle}</Text>

          {preview ? (
            <View style={styles.preview}>
              {preview.thumbUrl ? (
                <CachedImage uri={preview.thumbUrl} style={styles.previewImg} contentFit="cover" />
              ) : (
                <View style={[styles.previewImg, styles.previewPh]}>
                  <Ionicons name="home-outline" size={22} color={colors.leaf} />
                </View>
              )}
              <View style={styles.previewBody}>
                <Text style={styles.previewLoc} numberOfLines={2}>
                  {preview.location}
                </Text>
                <Text style={styles.previewRent}>{preview.rentLabel}</Text>
              </View>
            </View>
          ) : null}

          {loading ? (
            <ActivityIndicator color={colors.leaf} style={{ marginVertical: 24 }} />
          ) : unlockedListing && phone ? (
            <View>
              <Text style={styles.body}>{m.unlockSuccessHint}</Text>
              <View style={styles.actions}>
                <Pressable style={[styles.primaryBtn, styles.call]} onPress={() => callPhone(phone)}>
                  <Ionicons name="call" size={18} color={colors.onDark} />
                  <Text style={styles.primaryText}>{m.detailCall}</Text>
                </Pressable>
                <Pressable
                  style={[styles.primaryBtn, styles.wa]}
                  onPress={() =>
                    openWhatsApp(
                      phone,
                      lang === "fr"
                        ? `Bonjour, je suis intéressé par votre annonce Casa (${unlockedListing.houseId}).`
                        : `Hello, I'm interested in your Casa listing (${unlockedListing.houseId}).`
                    )
                  }
                >
                  <Ionicons name="logo-whatsapp" size={18} color={colors.onDark} />
                  <Text style={styles.primaryText}>{m.unlockMessageWhatsApp}</Text>
                </Pressable>
              </View>
              <Pressable style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>{m.detailClose}</Text>
              </Pressable>
            </View>
          ) : quote ? (
            <ScrollView>
              {quote.alreadyUnlocked ? (
                <Text style={styles.body}>{m.unlockAlreadyDone}</Text>
              ) : paymentsOn && !instant ? (
                <>
                  <Text style={styles.fee}>{m.unlockFee(quote.unlockFeeRwf)}</Text>
                  <Text style={styles.why}>{m.unlockWhy}</Text>
                  {quote.creditsAvailable > 0 ? (
                    <Text style={styles.credits}>{m.unlockCredits(quote.creditsAvailable)}</Text>
                  ) : null}
                  <Text style={styles.limit}>{m.unlockDailyLimit(quote.unlockLimit.usedToday, quote.unlockLimit.limit)}</Text>
                  <View style={styles.stepBox}>
                    <Text style={styles.stepLabel}>{m.unlockStepCopyLabel}</Text>
                    <Text style={styles.meta}>{quote.reference}</Text>
                    <Pressable style={styles.secondaryBtn} onPress={() => void copyReference()}>
                      <Text style={styles.secondaryBtnText}>{copied ? m.unlockCopied : m.unlockCopyReference}</Text>
                    </Pressable>
                  </View>
                  <View style={styles.stepBox}>
                    <Text style={styles.stepLabel}>{m.unlockStepPayLabel}</Text>
                    {instructions ? <Text style={styles.instructions}>{instructions}</Text> : null}
                    <Pressable style={styles.secondaryBtn} onPress={() => void Linking.openURL("tel:*182#")}>
                      <Text style={styles.secondaryBtnText}>{m.unlockOpenMomo}</Text>
                    </Pressable>
                  </View>
                  {quote.moveInCost ? (
                    <Text style={styles.limit}>{m.unlockMoveInTotal(quote.moveInCost.grandTotal)}</Text>
                  ) : null}
                </>
              ) : (
                <Text style={styles.body}>{m.unlockFreeForNow}</Text>
              )}
            </ScrollView>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {!unlockedListing ? (
            <View style={styles.actions}>
              <Pressable style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>{m.detailClose}</Text>
              </Pressable>
              {quote && !quote.alreadyUnlocked ? (
                <Pressable
                  style={[styles.primaryBtn, busy && styles.busy]}
                  disabled={busy || (paymentsOn && !instant ? false : !quote.unlockLimit.allowed)}
                  onPress={() => void tryUnlock(Boolean(paymentsOn && !instant))}
                >
                  {busy ? (
                    <ActivityIndicator color={colors.onDark} />
                  ) : (
                    <Text style={styles.primaryText}>
                      {paymentsOn && !instant ? m.unlockStepConfirmLabel : m.unlockShowNumber}
                    </Text>
                  )}
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(9, 28, 22, 0.45)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: c.paper,
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      padding: spacing.lg,
      paddingBottom: 36,
      maxHeight: "85%",
    },
    handle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.line,
      marginBottom: spacing.md,
    },
    title: { fontSize: 18, fontWeight: "700", color: c.ink, marginBottom: spacing.sm, fontFamily: fontFamily.bold },
    preview: { flexDirection: "row", gap: 12, marginBottom: spacing.md, alignItems: "center" },
    previewImg: { width: 72, height: 72, borderRadius: radii.md, backgroundColor: c.paper2 },
    previewPh: { alignItems: "center", justifyContent: "center" },
    previewBody: { flex: 1 },
    previewLoc: { fontSize: 15, fontWeight: "600", color: c.ink, fontFamily: fontFamily.semibold },
    previewRent: { fontSize: 14, fontWeight: "700", color: c.leaf, marginTop: 4, fontFamily: fontFamily.bold },
    why: { fontSize: 14, color: c.muted, marginTop: 8, lineHeight: 20, fontFamily: fontFamily.regular },
    fee: { fontSize: 22, fontWeight: "800", color: c.leaf, fontFamily: fontFamily.bold },
    body: { fontSize: 15, color: c.inkSoft, lineHeight: 22, fontFamily: fontFamily.regular },
    meta: { fontSize: 16, color: c.ink, marginTop: 6, fontFamily: fontFamily.semibold },
    credits: { fontSize: 13, color: c.leaf, fontWeight: "600", marginTop: 6 },
    limit: { fontSize: 12, color: c.mutedLight, marginTop: 6 },
    instructions: { fontSize: 14, color: c.inkSoft, marginTop: 8, lineHeight: 20 },
    stepBox: {
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: c.paper2,
      borderRadius: radii.md,
    },
    stepLabel: { fontWeight: "700", color: c.ink, fontFamily: fontFamily.semibold },
    secondaryBtn: {
      marginTop: 10,
      borderWidth: 1.5,
      borderColor: c.leaf,
      borderRadius: radii.md,
      paddingVertical: 12,
      alignItems: "center",
    },
    secondaryBtnText: { color: c.leaf, fontWeight: "700" },
    error: { color: c.danger, marginTop: 8, textAlign: "center" },
    actions: { flexDirection: "row", gap: 10, marginTop: spacing.md },
    cancelBtn: { flex: 1, paddingVertical: 14, alignItems: "center" },
    cancelText: { color: c.muted, fontWeight: "700" },
    primaryBtn: {
      flex: 2,
      flexDirection: "row",
      gap: 8,
      backgroundColor: c.leaf,
      borderRadius: radii.md,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    call: { backgroundColor: c.leaf },
    wa: { backgroundColor: c.wa },
    busy: { opacity: 0.7 },
    primaryText: { color: c.onDark, fontWeight: "700", fontFamily: fontFamily.semibold },
  });
}
