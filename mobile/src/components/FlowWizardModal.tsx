import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import CasaVideoPlayer from "./CasaVideoPlayer";
import ScreenLoader from "./ScreenLoader";
import type { CasaUser, Language, SessionInfo, UIAction } from "../api/client";
import { sendAppMessage, startLandlordVerification, uploadMedia } from "../api/client";
import { pickerAssetToBase64 } from "../utils/picker-asset";
import OptionGrid, { ChipRow } from "./OptionGrid";
import { RWANDA_DISTRICTS, regionLabel } from "../constants/regions";
import {
  MAJOR_TOWNS,
  MONTHS_UPFRONT_OPTIONS,
  RENT_PRESETS,
  SALE_PRICE_PRESETS,
  neighbourhoodsForTown,
} from "../constants/cities";
import {
  ELECTRICITY_OPTIONS,
  categoryMenuId,
  isSaleCategory,
  residentialSubtypeNeedsCounts,
  subtypesForCategory,
  type PropertyCategory,
} from "../constants/property-types";
import { mediaUrl } from "../config";
import { t } from "../i18n/strings";
import { radii, spacing, type ColorTokens } from "../theme/casa";
import { screenInsets } from "../theme/insets";
import { useCasaTheme } from "../theme/ThemeContext";

const MIN_LISTING_PHOTOS = 5;
const RENT_CHIPS = [...(RENT_PRESETS ?? [50000, 100000, 150000, 250000, 400000, 600000])];
const MONTH_CHIPS = [...(MONTHS_UPFRONT_OPTIONS ?? [1, 2, 3, 6, 12])];

function townQuarters(town: string): string[] {
  try {
    return typeof neighbourhoodsForTown === "function" ? townQuarters(town) : [];
  } catch {
    return [];
  }
}

function stripMd(text: string): string {
  return text.replace(/\*/g, "");
}

const LISTING_STEPS = [
  "ai_description",
  "category",
  "subtype",
  "bedroom_count",
  "toilet_count",
  "rent",
  "months_upfront",
  "region",
  "town",
  "quarter",
  "location",
  "fenced",
  "parking",
  "standby_generator",
  "borehole",
  "water",
  "electricity_meter",
  "furnished",
  "security",
  "photos",
  "video",
  "confirm",
] as const;

const AMENITY_STEPS = [
  "fenced",
  "parking",
  "standby_generator",
  "borehole",
  "water",
  "electricity_meter",
  "furnished",
  "security",
] as const;

function listingStage(step: string | undefined): 1 | 2 | 3 | 4 {
  if (!step) return 1;
  if (["ai_description", "category", "subtype", "bedroom_count", "toilet_count", "rent", "months_upfront"].includes(step)) {
    return 1;
  }
  if (["region", "town", "quarter", "location"].includes(step)) return 2;
  if ((AMENITY_STEPS as readonly string[]).includes(step)) return 3;
  return 4;
}

function collectText(actions: UIAction[]): string {
  return actions
    .filter((a): a is Extract<UIAction, { kind: "text" }> => a.kind === "text")
    .map((a) => stripMd(a.body))
    .join("\n\n");
}

function lastMenu(actions: UIAction[]): Extract<UIAction, { kind: "menu" }> | null {
  for (let i = actions.length - 1; i >= 0; i--) {
    if (actions[i].kind === "menu") return actions[i] as Extract<UIAction, { kind: "menu" }>;
  }
  return null;
}

interface Props {
  visible: boolean;
  token: string;
  user: CasaUser | null;
  uiLanguage: Language;
  title: string;
  startMode?: "menu" | "list" | "verify" | "extras";
  extrasPick?: string;
  onClose: () => void;
  onUserUpdate: (user: CasaUser | null, needsSignup: boolean) => void;
  onComplete?: () => void;
}

export default function FlowWizardModal({
  visible,
  token,
  user,
  uiLanguage,
  title,
  startMode = "menu",
  extrasPick,
  onClose,
  onUserUpdate,
  onComplete,
}: Props) {
  const lang = uiLanguage;
  const m = t(lang);
  const { colors, gradient } = useCasaTheme();
  const styles = useMemo(() => makeWizardStyles(colors), [colors]);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [actions, setActions] = useState<UIAction[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [error, setError] = useState("");
  const [photoCount, setPhotoCount] = useState(0);
  const [rentPick, setRentPick] = useState(50000);
  const [bedroomPick, setBedroomPick] = useState(2);
  const [toiletPick, setToiletPick] = useState(1);
  const [townInput, setTownInput] = useState("");
  const [quarterInput, setQuarterInput] = useState("");
  const [amenityForm, setAmenityForm] = useState({
    fenced: false,
    parking: false,
    standby_generator: false,
    borehole: false,
    water: true,
    electricity_meter: "2",
    furnished: false,
    security: false,
  });
  const [whatForm, setWhatForm] = useState({
    category: "residential" as PropertyCategory,
    subtypeId: "3",
    bedrooms: 2,
    toilets: 1,
    rent: 50000,
    months: 3,
  });
  const [whereForm, setWhereForm] = useState({ regionId: "5", town: "", quarter: "" });
  const [videoCount, setVideoCount] = useState(0);
  const [replyDraft, setReplyDraft] = useState("");

  const send = useCallback(
    async (
      payload: Parameters<typeof sendAppMessage>[1],
      opts?: { silent?: boolean }
    ) => {
      setBusy(true);
      setError("");
      try {
        const res = await sendAppMessage(token, payload);
        setActions(res.actions ?? []);
        setSession(res.session);
        onUserUpdate(res.user, res.needsSignup);
        if (
          !opts?.silent &&
          res.session?.flow === "main_menu" &&
          res.session.step === "idle" &&
          (startMode === "list" || startMode === "verify")
        ) {
          onComplete?.();
        }
        return res;
      } catch (e) {
        setError(e instanceof Error ? e.message : m.errorGeneric);
        return null;
      } finally {
        setBusy(false);
      }
    },
    [m.errorGeneric, onComplete, onUserUpdate, token]
  );

  const pickChoice = useCallback(
    async (id: string) => {
      await send({ text: id });
    },
    [send]
  );

  useEffect(() => {
    if (!visible) {
      setActions([]);
      setSession(null);
      setError("");
      setPhotoCount(0);
      setTownInput("");
      setQuarterInput("");
      setBedroomPick(2);
      setToiletPick(1);
      setVideoCount(0);
      setReplyDraft("");
      return;
    }
    void (async () => {
      if (startMode === "verify") {
        setBusy(true);
        try {
          const res = await startLandlordVerification(token);
          setActions(res.actions ?? []);
          setSession(res.session);
          onUserUpdate(res.user, false);
        } catch (e) {
          setError(e instanceof Error ? e.message : m.errorGeneric);
        } finally {
          setBusy(false);
        }
        return;
      }

      // Clear stale WhatsApp session (e.g. landlord_listings picker) before menu routing
      const reset = await send({ text: "menu" }, { silent: true });
      if (!reset) return;

      if (startMode === "menu") return;

      if (startMode === "list") {
        const listed = await send({ text: "1" }, { silent: true });
        if (!listed) return;
        // Skip AI vs step-by-step — mobile wizard uses structured steps
        await send({ text: "2" });
        return;
      }

      if (startMode === "extras") {
        const extras = await send({ text: "3" }, extrasPick ? { silent: true } : undefined);
        if (!extras || !extrasPick) return;
        await send({ text: extrasPick });
      }
    })();
  }, [visible, startMode, extrasPick]); // eslint-disable-line react-hooks/exhaustive-deps

  async function captureMedia(kind: "image" | "video", fromLibrary = false) {
    const perm = fromLibrary
      ? await ImagePicker.requestMediaLibraryPermissionsAsync()
      : await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setError(fromLibrary ? m.cameraDenied : m.cameraDenied);
      return;
    }
    setUploadBusy(true);
    try {
      const result = fromLibrary
        ? await ImagePicker.launchImageLibraryAsync({
            mediaTypes: kind === "video" ? ["videos"] : ["images"],
            quality: 0.55,
            base64: true,
            videoMaxDuration: 45,
          })
        : kind === "video"
          ? await ImagePicker.launchCameraAsync({ mediaTypes: ["videos"], videoMaxDuration: 45, base64: true })
          : await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.55, base64: true });
      const asset = result.assets?.[0];
      if (result.canceled || !asset?.uri) {
        return;
      }
      const data = await pickerAssetToBase64(asset);
      const uploaded = await uploadMedia(token, kind, data);
      await send({ mediaRef: uploaded.ref, mediaKind: kind });
      if (kind === "image") setPhotoCount((c) => c + 1);
      if (kind === "video") setVideoCount((c) => c + 1);
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      if (code === "FILE_TOO_LARGE") setError(m.errorUploadTooLarge);
      else if (code === "READ_FAILED") setError(m.errorUploadRead);
      else setError(e instanceof Error ? e.message : m.errorGeneric);
    } finally {
      setUploadBusy(false);
    }
  }

  async function replayTexts(texts: string[]): Promise<boolean> {
    for (const text of texts) {
      const res = await send({ text });
      if (!res) return false;
    }
    return true;
  }

  async function submitWhat() {
    const sale = isSaleCategory(whatForm.category);
    const catId = categoryMenuId(whatForm.category);
    const list = subtypesForCategory(whatForm.category);
    const sub = list.find((s) => s.id === whatForm.subtypeId) ?? list[0];
    const needsCounts =
      (whatForm.category === "residential" || whatForm.category === "house_sale") &&
      residentialSubtypeNeedsCounts(sub.key);
    const afterSubtype = [
      ...(needsCounts ? [String(whatForm.bedrooms), String(whatForm.toilets)] : []),
      String(whatForm.rent),
      ...(sale ? [] : [String(whatForm.months)]),
    ];
    if (step === "category") {
      await replayTexts([catId, sub.id, ...afterSubtype]);
      return;
    }
    if (step === "subtype") {
      await replayTexts([sub.id, ...afterSubtype]);
      return;
    }
    if (step === "bedroom_count") {
      await replayTexts([
        String(whatForm.bedrooms),
        String(whatForm.toilets),
        String(whatForm.rent),
        ...(sale ? [] : [String(whatForm.months)]),
      ]);
      return;
    }
    if (step === "toilet_count") {
      await replayTexts([
        String(whatForm.toilets),
        String(whatForm.rent),
        ...(sale ? [] : [String(whatForm.months)]),
      ]);
      return;
    }
    if (step === "rent") {
      await replayTexts([String(whatForm.rent), ...(sale ? [] : [String(whatForm.months)])]);
      return;
    }
    if (step === "months_upfront") {
      await replayTexts([String(whatForm.months)]);
    }
  }

  async function submitWhere() {
    if (whereForm.town.trim().length < 2 || whereForm.quarter.trim().length < 2) {
      setError(m.flowLocationTooShort);
      return;
    }
    if (step === "location") {
      await shareLocation();
      return;
    }
    if (step === "quarter") {
      const ok = await replayTexts([whereForm.quarter.trim()]);
      if (ok) await shareLocation();
      return;
    }
    if (step === "town") {
      const ok = await replayTexts([whereForm.town.trim(), whereForm.quarter.trim()]);
      if (ok) await shareLocation();
      return;
    }
    const ok = await replayTexts([
      whereForm.regionId,
      whereForm.town.trim(),
      whereForm.quarter.trim(),
    ]);
    if (ok) await shareLocation();
  }

  async function submitAmenities() {
    if (!step) return;
    const start = AMENITY_STEPS.indexOf(step as (typeof AMENITY_STEPS)[number]);
    if (start < 0) return;
    const remaining = AMENITY_STEPS.slice(start);
    for (const key of remaining) {
      const answer =
        key === "electricity_meter"
          ? amenityForm.electricity_meter
          : amenityForm[key] ? "yes" : "no";
      const res = await send({ text: answer });
      if (!res) return;
    }
  }

  async function shareLocation() {
    setBusy(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setError(m.locationDenied);
      setBusy(false);
      return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    await send({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
  }

  const menu = lastMenu(actions);
  const instruction = collectText(actions) || m.flowWorking;
  const flow = session?.flow;
  const step = session?.step;
  const hideBotCopy = flow === "landlord_listing" && Boolean(step) && step !== "mode";
  const sessionData = session?.data as { property_category?: string; town?: string } | undefined;
  const category = sessionData?.property_category;
  const locked = busy || uploadBusy;

  useEffect(() => {
    if (step === "quarter") setQuarterInput("");
  }, [step]);

  function submitTextInput(value: string) {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setError(m.flowLocationTooShort);
      return;
    }
    void pickChoice(trimmed);
  }

  function renderLocationInput(
    label: string,
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
    suggestions: { id: string; label: string }[]
  ) {
    return (
      <View style={styles.block}>
        <Text style={styles.blockLabel}>{label}</Text>
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedLight}
          editable={!locked}
          autoCapitalize="words"
        />
        {suggestions.length > 0 ? (
          <>
            <Text style={styles.suggestHint}>{m.flowSuggestions}</Text>
            <ChipRow
              disabled={locked}
              selectedId={value}
              items={suggestions}
              onSelect={(_id, labelText) => onChange(labelText)}
            />
          </>
        ) : null}
        <Pressable
          style={[styles.primaryBtn, locked && styles.btnDisabled]}
          disabled={locked || value.trim().length < 2}
          onPress={() => submitTextInput(value)}
        >
          <Text style={styles.primaryBtnText}>{m.flowConfirm}</Text>
        </Pressable>
      </View>
    );
  }

  function renderStepControls() {
    if (flow === "landlord_verify_id" && step === "await_id_photo") {
      return (
        <Pressable style={styles.primaryBtn} disabled={locked} onPress={() => void captureMedia("image")}>
          <Text style={styles.primaryBtnText}>📷 {m.takePhoto}</Text>
        </Pressable>
      );
    }

    if (flow === "landlord_listing") {
      if (step && listingStage(step) === 1 && step !== "ai_description") {
        const list = subtypesForCategory(whatForm.category);
        const sub = list.find((s) => s.id === whatForm.subtypeId);
        const sale = isSaleCategory(whatForm.category);
        const needsCounts =
          (whatForm.category === "residential" || whatForm.category === "house_sale") &&
          sub
            ? residentialSubtypeNeedsCounts(sub.key)
            : false;
        const pricePresets = sale ? SALE_PRICE_PRESETS : RENT_PRESETS;
        return (
          <View style={styles.block}>
            <Text style={styles.blockLabel}>{m.searchCategory}</Text>
            <View style={styles.amenityRow}>
              {(
                [
                  ["residential", "3", m.searchResidential],
                  ["commercial", "1", m.searchCommercial],
                  ["house_sale", "1", m.searchHouseSale],
                  ["land", "1", m.searchLand],
                ] as const
              ).map(([cat, subtypeId, label]) => (
                <Pressable
                  key={cat}
                  style={[styles.meterChip, whatForm.category === cat && styles.meterChipOn]}
                  onPress={() =>
                    setWhatForm((s) => ({
                      ...s,
                      category: cat,
                      subtypeId,
                      rent: cat === "house_sale" || cat === "land" ? 40000000 : s.rent < 10000000 ? s.rent : 50000,
                    }))
                  }
                >
                  <Text style={[styles.meterChipText, whatForm.category === cat && styles.meterChipTextOn]}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.blockLabel}>{m.searchPropertyType}</Text>
            <OptionGrid
              disabled={locked}
              selectedId={whatForm.subtypeId}
              options={list.map((s) => ({ id: s.id, label: lang === "fr" ? s.fr : s.en }))}
              onSelect={(id) => setWhatForm((s) => ({ ...s, subtypeId: id }))}
            />
            {needsCounts ? (
              <>
                <Text style={styles.blockLabel}>{m.flowPickBedrooms}</Text>
                <View style={styles.stepperRow}>
                  <Pressable style={styles.stepperBtn} onPress={() => setWhatForm((s) => ({ ...s, bedrooms: Math.max(1, s.bedrooms - 1) }))}>
                    <Text style={styles.stepperBtnText}>−</Text>
                  </Pressable>
                  <Text style={styles.stepperVal}>{whatForm.bedrooms}</Text>
                  <Pressable style={styles.stepperBtn} onPress={() => setWhatForm((s) => ({ ...s, bedrooms: Math.min(15, s.bedrooms + 1) }))}>
                    <Text style={styles.stepperBtnText}>+</Text>
                  </Pressable>
                </View>
                <Text style={styles.blockLabel}>{m.flowPickToilets}</Text>
                <View style={styles.stepperRow}>
                  <Pressable style={styles.stepperBtn} onPress={() => setWhatForm((s) => ({ ...s, toilets: Math.max(0, s.toilets - 1) }))}>
                    <Text style={styles.stepperBtnText}>−</Text>
                  </Pressable>
                  <Text style={styles.stepperVal}>{whatForm.toilets}</Text>
                  <Pressable style={styles.stepperBtn} onPress={() => setWhatForm((s) => ({ ...s, toilets: Math.min(8, s.toilets + 1) }))}>
                    <Text style={styles.stepperBtnText}>+</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
            <Text style={styles.blockLabel}>{sale ? m.flowPickSalePrice : m.flowPickRent}</Text>
            <ChipRow
              disabled={locked}
              selectedId={String(whatForm.rent)}
              items={pricePresets.map((n) => ({
                id: String(n),
                label: n >= 1000000 ? `${(n / 1000000).toFixed(0)}m` : `${(n / 1000).toFixed(0)}k`,
              }))}
              onSelect={(id) => setWhatForm((s) => ({ ...s, rent: Number(id) }))}
            />
            <View style={styles.stepperRow}>
              <Pressable
                style={styles.stepperBtn}
                onPress={() =>
                  setWhatForm((s) => ({
                    ...s,
                    rent: Math.max(10000, s.rent - (sale ? 1000000 : 5000)),
                  }))
                }
              >
                <Text style={styles.stepperBtnText}>−</Text>
              </Pressable>
              <Text style={styles.stepperVal}>{whatForm.rent.toLocaleString()} RWF</Text>
              <Pressable
                style={styles.stepperBtn}
                onPress={() =>
                  setWhatForm((s) => ({ ...s, rent: s.rent + (sale ? 1000000 : 5000) }))
                }
              >
                <Text style={styles.stepperBtnText}>+</Text>
              </Pressable>
            </View>
            {sale ? null : (
              <>
            <Text style={styles.blockLabel}>{m.cardMonths(whatForm.months)}</Text>
            <ChipRow
              disabled={locked}
              selectedId={String(whatForm.months)}
              items={MONTH_CHIPS.map((n) => ({ id: String(n), label: String(n) }))}
              onSelect={(id) => setWhatForm((s) => ({ ...s, months: Number(id) }))}
            />
              </>
            )}
            <Pressable style={[styles.primaryBtn, locked && styles.btnDisabled]} disabled={locked} onPress={() => void submitWhat()}>
              <Text style={styles.primaryBtnText}>{m.listAmenitiesNext}</Text>
            </Pressable>
          </View>
        );
      }
      if (step && listingStage(step) === 2) {
        return (
          <View style={styles.block}>
            <Text style={styles.blockLabel}>{m.searchRegion}</Text>
            <OptionGrid
              disabled={locked}
              selectedId={whereForm.regionId}
              options={RWANDA_DISTRICTS.map((r, i) => ({
                id: String(i + 1),
                label: regionLabel(r.id, lang),
              }))}
              onSelect={(id) => setWhereForm((s) => ({ ...s, regionId: id }))}
            />
            <Text style={styles.blockLabel}>{m.searchTown}</Text>
            <TextInput
              style={styles.textInput}
              value={whereForm.town}
              onChangeText={(town) => setWhereForm((s) => ({ ...s, town }))}
              placeholder={lang === "fr" ? "Kigali, Musanze…" : "Kigali, Musanze…"}
              placeholderTextColor={colors.mutedLight}
            />
            {MAJOR_TOWNS.length > 0 ? (
              <ChipRow
                disabled={locked}
                selectedId={whereForm.town}
                items={MAJOR_TOWNS.map((town) => ({ id: town, label: town }))}
                onSelect={(_id, labelText) => setWhereForm((s) => ({ ...s, town: labelText }))}
              />
            ) : null}
            <Text style={styles.blockLabel}>{m.searchNeighbourhood}</Text>
            <TextInput
              style={styles.textInput}
              value={whereForm.quarter}
              onChangeText={(quarter) => setWhereForm((s) => ({ ...s, quarter }))}
              placeholder={lang === "fr" ? "Kimironko, Nyarutarama…" : "Kimironko, Nyarutarama…"}
              placeholderTextColor={colors.mutedLight}
            />
            {whereForm.town ? (
              <ChipRow
                disabled={locked}
                selectedId={whereForm.quarter}
                items={townQuarters(whereForm.town).map((n) => ({ id: n, label: n }))}
                onSelect={(_id, labelText) => setWhereForm((s) => ({ ...s, quarter: labelText }))}
              />
            ) : null}
            <Pressable style={[styles.primaryBtn, locked && styles.btnDisabled]} disabled={locked} onPress={() => void submitWhere()}>
              <Text style={styles.primaryBtnText}>{m.shareLocation}</Text>
            </Pressable>
          </View>
        );
      }
      if (step === "bedroom_count") {
        return (
          <View style={styles.block}>
            <Text style={styles.blockLabel}>{m.flowPickBedrooms}</Text>
            <Text style={styles.suggestHint}>{m.flowBedroomsHint}</Text>
            <View style={styles.stepperRow}>
              <Pressable style={styles.stepperBtn} disabled={locked} onPress={() => setBedroomPick((n) => Math.max(1, n - 1))}>
                <Text style={styles.stepperBtnText}>−</Text>
              </Pressable>
              <Text style={styles.stepperVal}>{bedroomPick}</Text>
              <Pressable style={styles.stepperBtn} disabled={locked} onPress={() => setBedroomPick((n) => Math.min(15, n + 1))}>
                <Text style={styles.stepperBtnText}>+</Text>
              </Pressable>
              <Pressable style={styles.confirmBtn} disabled={locked} onPress={() => void pickChoice(String(bedroomPick))}>
                <Text style={styles.confirmBtnText}>{m.flowConfirm}</Text>
              </Pressable>
            </View>
          </View>
        );
      }
      if (step === "toilet_count") {
        return (
          <View style={styles.block}>
            <Text style={styles.blockLabel}>{m.flowPickToilets}</Text>
            <View style={styles.stepperRow}>
              <Pressable style={styles.stepperBtn} disabled={locked} onPress={() => setToiletPick((n) => Math.max(0, n - 1))}>
                <Text style={styles.stepperBtnText}>−</Text>
              </Pressable>
              <Text style={styles.stepperVal}>{toiletPick}</Text>
              <Pressable style={styles.stepperBtn} disabled={locked} onPress={() => setToiletPick((n) => Math.min(8, n + 1))}>
                <Text style={styles.stepperBtnText}>+</Text>
              </Pressable>
              <Pressable style={styles.confirmBtn} disabled={locked} onPress={() => void pickChoice(String(toiletPick))}>
                <Text style={styles.confirmBtnText}>{m.flowConfirm}</Text>
              </Pressable>
            </View>
          </View>
        );
      }
      if (step === "rent") {
        const sale = isSaleCategory(sessionData?.property_category);
        const presets = sale ? SALE_PRICE_PRESETS : RENT_PRESETS;
        return (
          <View style={styles.block}>
            <Text style={styles.blockLabel}>{sale ? m.flowPickSalePrice : m.flowPickRent}</Text>
            <ChipRow
              disabled={locked}
              selectedId={String(rentPick)}
              items={presets.map((n) => ({
                id: String(n),
                label: n >= 1000000 ? `${(n / 1000000).toFixed(0)}m` : `${(n / 1000).toFixed(0)}k`,
              }))}
              onSelect={(id) => {
                setRentPick(Number(id));
                void pickChoice(id);
              }}
            />
            <View style={styles.stepperRow}>
              <Pressable
                style={styles.stepperBtn}
                disabled={locked}
                onPress={() => setRentPick((r) => Math.max(10000, r - (sale ? 1000000 : 5000)))}
              >
                <Text style={styles.stepperBtnText}>−</Text>
              </Pressable>
              <Text style={styles.stepperVal}>{rentPick.toLocaleString()} RWF</Text>
              <Pressable
                style={styles.stepperBtn}
                disabled={locked}
                onPress={() => setRentPick((r) => r + (sale ? 1000000 : 5000))}
              >
                <Text style={styles.stepperBtnText}>+</Text>
              </Pressable>
              <Pressable style={styles.confirmBtn} disabled={locked} onPress={() => void pickChoice(String(rentPick))}>
                <Text style={styles.confirmBtnText}>{m.flowConfirm}</Text>
              </Pressable>
            </View>
          </View>
        );
      }
      if (step === "months_upfront") {
        return (
          <ChipRow
            disabled={locked}
            items={MONTH_CHIPS.map((n) => ({ id: String(n), label: String(n) }))}
            onSelect={(id) => void pickChoice(id)}
          />
        );
      }
      if (step === "region") {
        return (
          <OptionGrid
            disabled={locked}
            options={RWANDA_DISTRICTS.map((r, i) => ({
              id: String(i + 1),
              label: regionLabel(r.id, lang),
            }))}
            onSelect={(id) => void pickChoice(id)}
          />
        );
      }
      if (step === "town") {
        return renderLocationInput(
          m.searchTown,
          townInput,
          setTownInput,
          lang === "fr" ? "Kigali, Musanze, Huye…" : "Kigali, Musanze, Huye…",
          MAJOR_TOWNS.map((town) => ({ id: town, label: town }))
        );
      }
      if (step === "quarter") {
        const town = townInput.trim() || String(sessionData?.town ?? "");
        return renderLocationInput(
          m.searchNeighbourhood,
          quarterInput,
          setQuarterInput,
          lang === "fr" ? "Kimironko, Remera, Nyarutarama…" : "Kimironko, Remera, Nyarutarama…",
          town ? townQuarters(town).map((n) => ({ id: n, label: n })) : []
        );
      }
      if (step === "location") {
        return (
          <Pressable style={styles.primaryBtn} disabled={locked} onPress={() => void shareLocation()}>
            <Text style={styles.primaryBtnText}>{m.shareLocation}</Text>
          </Pressable>
        );
      }
      if ((AMENITY_STEPS as readonly string[]).includes(step ?? "")) {
        const labels: Record<(typeof AMENITY_STEPS)[number], string> = {
          fenced: m.detailFenced,
          parking: m.detailParking,
          standby_generator: m.detailGenerator,
          borehole: m.detailBorehole,
          water: m.detailWater,
          electricity_meter: m.searchElectricity,
          furnished: m.detailFurnished,
          security: m.detailSecurity,
        };
        const start = AMENITY_STEPS.indexOf(step as (typeof AMENITY_STEPS)[number]);
        const remaining = AMENITY_STEPS.slice(Math.max(0, start));
        return (
          <View style={styles.block}>
            {remaining.map((key) =>
              key === "electricity_meter" ? (
                <View key={key}>
                  <Text style={styles.blockLabel}>{labels[key]}</Text>
                  <View style={styles.amenityRow}>
                    {ELECTRICITY_OPTIONS.map((o) => (
                      <Pressable
                        key={o.id}
                        style={[styles.meterChip, amenityForm.electricity_meter === o.id && styles.meterChipOn]}
                        onPress={() => setAmenityForm((s) => ({ ...s, electricity_meter: o.id }))}
                      >
                        <Text style={[styles.meterChipText, amenityForm.electricity_meter === o.id && styles.meterChipTextOn]}>
                          {lang === "fr" ? o.fr : o.en}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : (
                <Pressable
                  key={key}
                  style={[styles.toggleRow, amenityForm[key] && styles.toggleRowOn]}
                  onPress={() => setAmenityForm((s) => ({ ...s, [key]: !s[key] }))}
                >
                  <Text style={[styles.toggleLabel, amenityForm[key] && styles.toggleLabelOn]}>{labels[key]}</Text>
                  <Text style={[styles.toggleVal, amenityForm[key] && styles.toggleValOn]}>{amenityForm[key] ? m.flowYes : m.flowNo}</Text>
                </Pressable>
              )
            )}
            <Pressable style={styles.primaryBtn} disabled={locked} onPress={() => void submitAmenities()}>
              <Text style={styles.primaryBtnText}>{m.listAmenitiesNext}</Text>
            </Pressable>
          </View>
        );
      }
      if (step === "electricity_meter") {
        return null;
      }
      if (step === "subtype") {
        const cat: PropertyCategory =
          category === "commercial" || category === "house_sale" || category === "land"
            ? category
            : "residential";
        const list = subtypesForCategory(cat);
        return (
          <OptionGrid
            disabled={locked}
            options={list.map((s) => ({ id: s.id, label: lang === "fr" ? s.fr : s.en }))}
            onSelect={(id) => void pickChoice(id)}
          />
        );
      }
      if (step === "photos") {
        return (
          <View style={styles.block}>
            <Text style={styles.hint}>{m.listPhotosHint}</Text>
            {photoCount > 0 ? (
              <Text style={styles.photoCount}>{m.flowPhotosAdded(photoCount)}</Text>
            ) : null}
            <Pressable style={styles.primaryBtn} disabled={locked} onPress={() => void captureMedia("image")}>
              <Text style={styles.primaryBtnText}>{m.takePhoto}</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} disabled={locked} onPress={() => void captureMedia("image", true)}>
              <Text style={styles.secondaryBtnText}>{m.pickFromGallery}</Text>
            </Pressable>
            <Pressable
              style={[styles.secondaryBtn, photoCount < MIN_LISTING_PHOTOS && styles.btnDisabled]}
              disabled={locked || photoCount < MIN_LISTING_PHOTOS}
              onPress={() => void pickChoice("done")}
            >
              <Text style={styles.secondaryBtnText}>{m.flowPhotosDone}</Text>
            </Pressable>
          </View>
        );
      }
      if (step === "video") {
        return (
          <View style={styles.block}>
            <Text style={styles.hint}>{m.listVideoRequired}</Text>
            {videoCount > 0 ? (
              <Text style={styles.photoCount}>{m.flowPhotosAdded(videoCount)}</Text>
            ) : null}
            <Pressable style={styles.primaryBtn} disabled={locked} onPress={() => void captureMedia("video")}>
              <Text style={styles.primaryBtnText}>{m.takeVideo}</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} disabled={locked} onPress={() => void captureMedia("video", true)}>
              <Text style={styles.secondaryBtnText}>{m.pickFromGallery}</Text>
            </Pressable>
            {videoCount > 0 ? (
              <Pressable style={styles.secondaryBtn} disabled={locked} onPress={() => void pickChoice("done")}>
                <Text style={styles.secondaryBtnText}>{m.flowVideoDone}</Text>
              </Pressable>
            ) : null}
          </View>
        );
      }
      if (step === "confirm") {
        return (
          <View style={styles.row2}>
            <Pressable style={[styles.primaryBtn, styles.half]} disabled={locked} onPress={() => void pickChoice("yes")}>
              <Text style={styles.primaryBtnText}>{m.flowPublish}</Text>
            </Pressable>
            <Pressable style={[styles.secondaryBtn, styles.half]} disabled={locked} onPress={() => void pickChoice("no")}>
              <Text style={styles.secondaryBtnText}>{m.flowCancelPublish}</Text>
            </Pressable>
          </View>
        );
      }
    }

    if (flow === "landlord_extras" && step === "bulk_action") {
      return (
        <View style={styles.block}>
          <Pressable
            style={[styles.primaryBtn, locked && styles.btnDisabled]}
            disabled={locked}
            onPress={() => void pickChoice("ACTIVATE ALL")}
          >
            <Text style={styles.primaryBtnText}>{m.landlordBulkActivate}</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryBtn}
            disabled={locked}
            onPress={() => void pickChoice("DEACTIVATE ALL")}
          >
            <Text style={styles.secondaryBtnText}>{m.landlordBulkDeactivate}</Text>
          </Pressable>
        </View>
      );
    }

    const needsReply =
      (flow === "landlord_extras" && (step === "lease_house_id" || step === "link_landlord")) ||
      (flow === "tenant_extras" && (step === "save_alert" || step === "flag_reason")) ||
      (flow === "tenant_search" && step === "diaspora_phone");

    if (needsReply) {
      return (
        <View style={styles.block}>
          <TextInput
            style={styles.textInput}
            value={replyDraft}
            onChangeText={setReplyDraft}
            placeholder={m.messagePlaceholder}
            placeholderTextColor={colors.mutedLight}
            editable={!locked}
            autoCapitalize={step === "lease_house_id" ? "characters" : "sentences"}
            keyboardType={step === "link_landlord" || step === "diaspora_phone" ? "phone-pad" : "default"}
          />
          <Pressable
            style={[styles.primaryBtn, locked && styles.btnDisabled]}
            disabled={locked || replyDraft.trim().length < 2}
            onPress={() => {
              const value = replyDraft.trim();
              setReplyDraft("");
              void pickChoice(value);
            }}
          >
            <Text style={styles.primaryBtnText}>{m.send}</Text>
          </Pressable>
        </View>
      );
    }

    return null;
  }

  let stepControls = null;
  try {
    stepControls = renderStepControls();
  } catch (e) {
    stepControls = (
      <Text style={styles.error}>{e instanceof Error ? e.message : m.errorGeneric}</Text>
    );
  }
  const filteredMenuOptions =
    menu && flow === "landlord_listing" && step === "mode"
      ? menu.options.filter((o) => o.id !== "1")
      : menu?.options ?? [];
  const showMenu = menu && !stepControls && filteredMenuOptions.length > 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.root}>
        <LinearGradient colors={[...gradient.header]} style={[styles.header, { paddingTop: screenInsets().top }]}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>{m.detailClose}</Text>
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {flow === "landlord_listing" && step && step !== "mode"
              ? m.listStepOf(listingStage(step), 4)
              : title}
          </Text>
          <View style={{ width: 48 }} />
        </LinearGradient>

        {flow === "landlord_listing" && step && step !== "mode" ? (
          <View style={styles.stageRow}>
            {([1, 2, 3, 4] as const).map((n) => {
              const labels = [m.listStepWhat, m.listStepWhere, m.listStepHome, m.listStepPhotos];
              const active = listingStage(step) === n;
              const done = listingStage(step) > n;
              return (
                <View key={n} style={styles.stageItem}>
                  <View style={[styles.stageDot, (active || done) && styles.stageDotOn]} />
                  <Text style={[styles.stageLabel, active && styles.stageLabelOn]}>{labels[n - 1]}</Text>
                </View>
              );
            })}
          </View>
        ) : null}

        <ScrollView contentContainerStyle={styles.scroll}>
          {(busy || uploadBusy) && !actions.length ? (
            <ScreenLoader count={1} />
          ) : null}

          {(!hideBotCopy || step === "confirm") && instruction ? (
            <Text style={styles.instruction}>{instruction}</Text>
          ) : null}

          {actions.map((action, idx) => {
            if (action.kind === "image") {
              const uri = action.ref.startsWith("http") ? action.ref : mediaUrl(action.ref, "image");
              return <Image key={idx} source={{ uri }} style={styles.preview} />;
            }
            if (action.kind === "video") {
              const uri = action.ref.startsWith("http") ? action.ref : mediaUrl(action.ref, "video");
              return <CasaVideoPlayer key={`${idx}-${uri}`} uri={uri} style={styles.preview} />;
            }
            return null;
          })}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {showMenu ? (
            <OptionGrid
              disabled={locked}
              options={filteredMenuOptions.map((o) => ({
                id: o.id,
                label: o.title,
                description: o.description,
              }))}
              onSelect={(id) => void pickChoice(id)}
            />
          ) : null}

          {stepControls}
        </ScrollView>
      </View>
    </Modal>
  );
}

function makeWizardStyles(c: ColorTokens) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.paper2 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingBottom: 14,
      paddingHorizontal: spacing.lg,
    },
    close: { color: c.onDark, fontWeight: "700" },
    menuLink: { color: c.onDark, fontWeight: "700", fontSize: 13 },
    headerTitle: { color: c.onDark, fontWeight: "800", fontSize: 17 },
    progressTrack: {
      flexDirection: "row",
      height: 4,
      backgroundColor: c.line,
    },
    progressFill: {
      backgroundColor: c.leafBright,
      height: 4,
    },
    stageRow: {
      flexDirection: "row",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: c.paper,
      gap: 4,
    },
    stageItem: { flex: 1, alignItems: "center", gap: 4 },
    stageDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.line },
    stageDotOn: { backgroundColor: c.leaf },
    stageLabel: { fontSize: 11, color: c.muted, fontWeight: "600" },
    stageLabelOn: { color: c.leaf },
    hint: { fontSize: 14, color: c.muted, lineHeight: 20, marginBottom: 8 },
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: c.paper,
      paddingHorizontal: 12,
      paddingVertical: 14,
      borderRadius: radii.md,
      borderWidth: 2,
      borderColor: c.lineStrong,
    },
    toggleRowOn: { backgroundColor: c.leaf, borderColor: c.leaf },
    toggleLabel: { fontSize: 15, color: c.ink, fontWeight: "600" },
    toggleLabelOn: { color: c.onDark },
    toggleVal: { fontSize: 14, color: c.muted, fontWeight: "700" },
    toggleValOn: { color: c.onDark },
    amenityRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
    meterChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radii.pill,
      backgroundColor: c.paper,
      borderWidth: 1,
      borderColor: c.line,
    },
    meterChipOn: { backgroundColor: c.leaf, borderColor: c.leaf },
    meterChipText: { fontSize: 13, fontWeight: "600", color: c.muted },
    meterChipTextOn: { color: c.onDark },
    scroll: { padding: spacing.lg, paddingBottom: 80 },
    instruction: { fontSize: 16, lineHeight: 24, color: c.forest, marginBottom: spacing.lg },
    preview: { width: "100%", height: 180, borderRadius: radii.sm, marginBottom: spacing.md, backgroundColor: c.paper },
    error: { color: c.danger, marginBottom: spacing.md },
    block: { gap: 10, marginTop: spacing.sm },
    blockLabel: { fontWeight: "700", color: c.inkSoft, marginBottom: 4 },
    textInput: {
      backgroundColor: c.paper,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: c.lineStrong,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontSize: 16,
      color: c.ink,
    },
    suggestHint: { fontSize: 12, color: c.mutedLight, marginTop: 10, marginBottom: 4 },
    btnDisabled: { opacity: 0.5 },
    primaryBtn: {
      backgroundColor: c.leaf,
      borderRadius: radii.sm,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: spacing.sm,
    },
    primaryBtnText: { color: c.onDark, fontWeight: "800", fontSize: 15 },
    secondaryBtn: {
      backgroundColor: c.paper,
      borderRadius: radii.sm,
      borderWidth: 1.5,
      borderColor: c.leaf,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: spacing.sm,
    },
    secondaryBtnText: { color: c.leaf, fontWeight: "800", fontSize: 15 },
    row2: { flexDirection: "row", gap: 10, marginTop: spacing.sm },
    half: { flex: 1, marginTop: 0 },
    stepperRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: spacing.md, flexWrap: "wrap" },
    stepperBtn: {
      width: 44,
      height: 44,
      borderRadius: radii.sm,
      backgroundColor: c.paper,
      borderWidth: 1,
      borderColor: c.leaf,
      alignItems: "center",
      justifyContent: "center",
    },
    stepperBtnText: { fontSize: 22, fontWeight: "800", color: c.leaf },
    stepperVal: { flex: 1, textAlign: "center", fontWeight: "800", color: c.forest, minWidth: 100 },
    confirmBtn: {
      backgroundColor: c.leaf,
      paddingHorizontal: spacing.lg,
      paddingVertical: 12,
      borderRadius: radii.sm,
    },
    confirmBtnText: { color: c.onDark, fontWeight: "800" },
    photoCount: { color: c.leaf, fontWeight: "700" },
  });
}
