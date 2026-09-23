import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { Language } from "../api/client";
import { RWANDA_DISTRICTS, regionLabel } from "../constants/regions";
import { t } from "../i18n/strings";
import { radii, spacing, type ColorTokens } from "../theme/casa";
import { fontFamily } from "../theme/fonts";
import { screenInsets } from "../theme/insets";
import { useCasaTheme } from "../theme/ThemeContext";

export type SearchSort = "newest" | "price_asc" | "price_desc" | "distance";

export interface FilterValues {
  regionId: string;
  minRent: string;
  maxRent: string;
  parking: boolean;
  water: boolean;
  fenced: boolean;
  standbyGenerator: boolean;
  propertyCategory: "either" | "residential" | "commercial" | "house_sale" | "land";
  sort: SearchSort;
  propertySubtype: string;
  minBedrooms: string;
  minToilets: string;
  furnished: boolean;
  security: boolean;
  electricityMeter: "" | "prepaid" | "postpaid" | "none";
}

interface Props {
  visible: boolean;
  language: Language;
  values: FilterValues;
  onChange: (next: FilterValues) => void;
  onApply: () => void;
  onClear: () => void;
  onClose: () => void;
}

function Chip({
  label,
  active,
  onPress,
  styles,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <Pressable style={[styles.chip, active && styles.chipOn]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

export default function FilterSheet({
  visible,
  language,
  values,
  onChange,
  onApply,
  onClear,
  onClose,
}: Props) {
  const m = t(language);
  const { colors } = useCasaTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [more, setMore] = useState(false);
  const patch = (partial: Partial<FilterValues>) => onChange({ ...values, ...partial });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={[styles.header, { paddingTop: screenInsets().top }]}>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel={m.detailClose}>
            <Ionicons name="close" size={24} color={colors.ink} />
          </Pressable>
          <Text style={styles.title}>{m.filters}</Text>
          <Pressable onPress={onClear} hitSlop={12}>
            <Text style={styles.clear}>{m.filtersClear}</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.label}>{m.searchMinRent} / {m.searchMaxRent}</Text>
          <Text style={styles.hint}>{m.searchPriceHint}</Text>
          <View style={styles.priceRow}>
            <TextInput
              style={styles.input}
              value={values.minRent}
              onChangeText={(minRent) => patch({ minRent })}
              keyboardType="number-pad"
              placeholder="25 000"
              placeholderTextColor={colors.mutedLight}
            />
            <Text style={styles.dash}>—</Text>
            <TextInput
              style={styles.input}
              value={values.maxRent}
              onChangeText={(maxRent) => patch({ maxRent })}
              keyboardType="number-pad"
              placeholder="150 000"
              placeholderTextColor={colors.mutedLight}
            />
          </View>

          <Text style={styles.label}>{m.searchMinBeds}</Text>
          <View style={styles.wrap}>
            {["", "1", "2", "3"].map((n) => (
              <Chip
                key={`bed-${n || "any"}`}
                label={n ? `${n}+` : m.searchAnyType}
                active={values.minBedrooms === n}
                onPress={() => patch({ minBedrooms: n })}
                styles={styles}
              />
            ))}
          </View>

          <Text style={styles.label}>{m.searchCategory}</Text>
          <View style={styles.wrap}>
            <Chip label={m.searchAnyType} active={values.propertyCategory === "either"} onPress={() => patch({ propertyCategory: "either" })} styles={styles} />
            <Chip label={m.searchResidential} active={values.propertyCategory === "residential"} onPress={() => patch({ propertyCategory: "residential" })} styles={styles} />
            <Chip label={m.searchCommercial} active={values.propertyCategory === "commercial"} onPress={() => patch({ propertyCategory: "commercial" })} styles={styles} />
            <Chip label={m.searchHouseSale} active={values.propertyCategory === "house_sale"} onPress={() => patch({ propertyCategory: "house_sale" })} styles={styles} />
            <Chip label={m.searchLand} active={values.propertyCategory === "land"} onPress={() => patch({ propertyCategory: "land" })} styles={styles} />
          </View>

          <Text style={styles.label}>{m.searchPropertyType}</Text>
          <View style={styles.wrap}>
            {(
              values.propertyCategory === "house_sale"
                ? ([
                    ["", m.searchAnyType],
                    ["house", m.searchHouseSale],
                    ["villa", "Villa"],
                    ["apartment_sale", m.searchSubtypeApartment],
                  ] as const)
                : values.propertyCategory === "land"
                  ? ([
                      ["", m.searchAnyType],
                      ["residential_plot", m.searchLand],
                      ["commercial_plot", m.searchCommercial],
                      ["farmland", "Farmland"],
                    ] as const)
                  : ([
                      ["", m.searchAnyType],
                      ["studio", m.searchSubtypeStudio],
                      ["two_bedroom", m.searchSubtypeApartment],
                      ["bungalow", m.searchSubtypeHouse],
                    ] as const)
            ).map(([id, label]) => (
              <Chip key={id || "any"} label={label} active={values.propertySubtype === id} onPress={() => patch({ propertySubtype: id })} styles={styles} />
            ))}
          </View>

          <Pressable style={styles.moreBtn} onPress={() => setMore((v) => !v)}>
            <Text style={styles.moreText}>{more ? m.filtersLess : m.filtersMore}</Text>
            <Ionicons name={more ? "chevron-up" : "chevron-down"} size={18} color={colors.leaf} />
          </Pressable>

          {more ? (
            <>
          <Text style={styles.label}>{m.searchSort}</Text>
          <View style={styles.wrap}>
            {([
              ["newest", m.sortNewest],
              ["price_asc", m.sortPriceAsc],
              ["price_desc", m.sortPriceDesc],
              ["distance", m.sortDistance],
            ] as const).map(([id, label]) => (
              <Chip key={id} label={label} active={values.sort === id} onPress={() => patch({ sort: id })} styles={styles} />
            ))}
          </View>

          <Text style={styles.label}>{m.searchMinToilets}</Text>
          <View style={styles.wrap}>
            {["", "1", "2"].map((n) => (
              <Chip
                key={`bath-${n || "any"}`}
                label={n ? `${n}+` : m.searchAnyType}
                active={values.minToilets === n}
                onPress={() => patch({ minToilets: n })}
                styles={styles}
              />
            ))}
          </View>

          <Text style={styles.label}>{m.searchRegion}</Text>
          <View style={styles.wrap}>
            <Chip label={m.searchAnyRegion} active={!values.regionId} onPress={() => patch({ regionId: "" })} styles={styles} />
            {RWANDA_DISTRICTS.map((r) => (
              <Chip
                key={r.id}
                label={regionLabel(r.id, language)}
                active={values.regionId === r.id}
                onPress={() => patch({ regionId: r.id })}
                styles={styles}
              />
            ))}
          </View>

          <Text style={styles.label}>{m.searchElectricity}</Text>
          <View style={styles.wrap}>
            <Chip label={m.searchAnyType} active={values.electricityMeter === ""} onPress={() => patch({ electricityMeter: "" })} styles={styles} />
            <Chip label={m.searchMeterPrepaid} active={values.electricityMeter === "prepaid"} onPress={() => patch({ electricityMeter: "prepaid" })} styles={styles} />
            <Chip label={m.searchMeterPostpaid} active={values.electricityMeter === "postpaid"} onPress={() => patch({ electricityMeter: "postpaid" })} styles={styles} />
          </View>

          <Text style={styles.label}>{m.detailAmenities}</Text>
          <View style={styles.wrap}>
            <Chip label={m.searchFurnished} active={values.furnished} onPress={() => patch({ furnished: !values.furnished })} styles={styles} />
            <Chip label={m.searchSecurity} active={values.security} onPress={() => patch({ security: !values.security })} styles={styles} />
            <Chip label={m.searchParking} active={values.parking} onPress={() => patch({ parking: !values.parking })} styles={styles} />
            <Chip label={m.searchWater} active={values.water} onPress={() => patch({ water: !values.water })} styles={styles} />
            <Chip label={m.searchFenced} active={values.fenced} onPress={() => patch({ fenced: !values.fenced })} styles={styles} />
            <Chip label={m.searchGenerator} active={values.standbyGenerator} onPress={() => patch({ standbyGenerator: !values.standbyGenerator })} styles={styles} />
          </View>
            </>
          ) : null}
        </ScrollView>

        <Pressable style={[styles.apply, { marginBottom: spacing.lg + screenInsets().bottom }]} onPress={onApply}>
          <Text style={styles.applyText}>{m.filtersApply}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

function makeStyles(c: ColorTokens) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.paper2 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      backgroundColor: c.paper,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.line,
    },
    title: { fontSize: 17, fontWeight: "600", color: c.ink, fontFamily: fontFamily.semibold },
    clear: { color: c.leaf, fontWeight: "600", fontFamily: fontFamily.semibold },
    scroll: { padding: spacing.lg, paddingBottom: 48 },
    label: {
      fontSize: 13,
      fontWeight: "600",
      color: c.inkSoft,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
      fontFamily: fontFamily.semibold,
    },
    hint: { fontSize: 12, color: c.mutedLight, marginBottom: 8, fontFamily: fontFamily.regular },
    wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radii.pill,
      backgroundColor: c.paper,
      borderWidth: 1,
      borderColor: c.line,
    },
    chipOn: { backgroundColor: c.leaf, borderColor: c.leaf },
    chipText: { fontSize: 13, fontWeight: "600", color: c.muted, fontFamily: fontFamily.semibold },
    chipTextOn: { color: c.onDark },
    priceRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    input: {
      flex: 1,
      backgroundColor: c.paper,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.lineStrong,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      fontSize: 16,
      color: c.ink,
      fontFamily: fontFamily.regular,
    },
    dash: { color: c.muted, fontWeight: "700" },
    apply: {
      margin: spacing.lg,
      backgroundColor: c.leaf,
      borderRadius: radii.md,
      paddingVertical: 16,
      alignItems: "center",
    },
    applyText: { color: c.onDark, fontWeight: "600", fontSize: 16, fontFamily: fontFamily.semibold },
    moreBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: spacing.md,
      marginTop: spacing.sm,
    },
    moreText: { color: c.leaf, fontWeight: "600", fontSize: 14, fontFamily: fontFamily.semibold },
  });
}

export function countActiveFilters(v: FilterValues): number {
  let n = 0;
  if (v.regionId) n += 1;
  if (v.minRent) n += 1;
  if (v.maxRent) n += 1;
  if (v.parking) n += 1;
  if (v.water) n += 1;
  if (v.fenced) n += 1;
  if (v.standbyGenerator) n += 1;
  if (v.propertyCategory !== "either") n += 1;
  if (v.propertySubtype) n += 1;
  if (v.minBedrooms) n += 1;
  if (v.minToilets) n += 1;
  if (v.furnished) n += 1;
  if (v.security) n += 1;
  if (v.electricityMeter) n += 1;
  if (v.sort !== "newest") n += 1;
  return n;
}

export const emptyFilters = (): FilterValues => ({
  regionId: "",
  minRent: "",
  maxRent: "",
  parking: false,
  water: false,
  fenced: false,
  standbyGenerator: false,
  propertyCategory: "either",
  sort: "newest",
  propertySubtype: "",
  minBedrooms: "",
  minToilets: "",
  furnished: false,
  security: false,
  electricityMeter: "",
});
