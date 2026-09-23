import { describe, expect, it } from "vitest";
import {
  RWANDA_DISTRICTS,
  COMMERCIAL_SUBTYPES,
  RESIDENTIAL_SUBTYPES,
  categoryLabel,
  electricityMeterLabel,
  formatElectricityMeterMenu,
  formatSubtypeMenu,
  legacyTypeFromSubtype,
  parseCategoryChoice,
  parseElectricityMeterChoice,
  parseRegionChoice,
  parseSubtypeChoice,
  subtypeLabel,
} from "../constants/property-taxonomy.js";

describe("property taxonomy", () => {
  it("lists all 30 Rwandan districts including Kigali city", () => {
    expect(RWANDA_DISTRICTS).toHaveLength(30);
    expect(RWANDA_DISTRICTS.map((s) => s.id)).toContain("gasabo");
    expect(RWANDA_DISTRICTS.map((s) => s.id)).toContain("kicukiro");
    expect(RWANDA_DISTRICTS.map((s) => s.id)).toContain("nyarugenge");
    expect(RWANDA_DISTRICTS.map((s) => s.id)).toContain("musanze");
    expect(RWANDA_DISTRICTS.map((s) => s.id)).toContain("rubavu");
  });

  it("parses region by number and name", () => {
    expect(parseRegionChoice("1")).toBe(RWANDA_DISTRICTS[0].id);
    expect(parseRegionChoice("Kigali")).toBe("gasabo");
    expect(parseRegionChoice("Gasabo")).toBe("gasabo");
    expect(parseRegionChoice("kimironko")).toBe("gasabo");
    expect(parseRegionChoice("Musanze")).toBe("musanze");
    expect(parseRegionChoice("invalid")).toBeNull();
  });

  it("parses residential and commercial categories", () => {
    expect(parseCategoryChoice("1")).toBe("residential");
    expect(parseCategoryChoice("2")).toBe("commercial");
    expect(parseCategoryChoice("I need commercial space")).toBe("commercial");
    expect(parseCategoryChoice("hotel")).toBeNull();
  });

  it("parses residential subtypes by menu index", () => {
    expect(parseSubtypeChoice("1", "residential")).toBe("single_room");
    expect(parseSubtypeChoice("2", "residential")).toBe("double_room");
    expect(parseSubtypeChoice("4", "residential")).toBe("self_contained");
    expect(parseSubtypeChoice("99", "residential")).toBeNull();
  });

  it("exposes expected subtype counts", () => {
    expect(COMMERCIAL_SUBTYPES).toHaveLength(8);
    expect(RESIDENTIAL_SUBTYPES).toHaveLength(11);
  });

  it("maps subtypes to legacy types", () => {
    expect(legacyTypeFromSubtype("single_room")).toBe("room");
    expect(legacyTypeFromSubtype("double_room")).toBe("room");
    expect(legacyTypeFromSubtype("bedsitter")).toBe("room");
    expect(legacyTypeFromSubtype("servant_quarter")).toBe("room");
    expect(legacyTypeFromSubtype("self_contained")).toBe("apartment");
    expect(legacyTypeFromSubtype("two_bedroom")).toBe("apartment");
  });

  it("labels subtypes", () => {
    expect(subtypeLabel("self_contained", "en")).toMatch(/self-contained/i);
    expect(subtypeLabel("maisonette", "en")).toContain("Maisonette");
  });

  it("labels categories", () => {
    expect(categoryLabel("residential", "en")).toBe("Residential");
    expect(categoryLabel("commercial", "fr")).toBe("Commercial");
  });

  it("formats subtype menus", () => {
    expect(formatSubtypeMenu("residential", "en")).toContain("Bedsitter");
    expect(formatSubtypeMenu("commercial", "en")).toContain("Shop");
  });

  it("parses electricity meter choices with REG wording", () => {
    expect(formatElectricityMeterMenu("en")).toContain("REG");
    expect(parseElectricityMeterChoice("2")).toBe("prepaid");
    expect(electricityMeterLabel("prepaid", "en")).toContain("REG");
  });
});
