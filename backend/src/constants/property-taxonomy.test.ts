import { describe, expect, it } from "vitest";
import {
  RWANDA_DISTRICTS,
  COMMERCIAL_SUBTYPES,
  HOUSE_SALE_SUBTYPES,
  LAND_SUBTYPES,
  RESIDENTIAL_SUBTYPES,
  categoryLabel,
  electricityMeterLabel,
  formatElectricityMeterMenu,
  formatSubtypeMenu,
  isSaleCategory,
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

  it("parses residential, commercial, and sale categories", () => {
    expect(parseCategoryChoice("1")).toBe("residential");
    expect(parseCategoryChoice("2")).toBe("commercial");
    expect(parseCategoryChoice("3")).toBe("house_sale");
    expect(parseCategoryChoice("4")).toBe("land");
    expect(parseCategoryChoice("I need commercial space")).toBe("commercial");
    expect(parseCategoryChoice("house for sale")).toBe("house_sale");
    expect(parseCategoryChoice("plot in Kanombe")).toBe("land");
    expect(parseCategoryChoice("hotel")).toBeNull();
    expect(isSaleCategory("house_sale")).toBe(true);
    expect(isSaleCategory("residential")).toBe(false);
  });

  it("parses residential subtypes by menu index", () => {
    expect(parseSubtypeChoice("1", "residential")).toBe("single_room");
    expect(parseSubtypeChoice("2", "residential")).toBe("double_room");
    expect(parseSubtypeChoice("3", "residential")).toBe("self_contained");
    expect(parseSubtypeChoice("4", "residential")).toBe("studio");
    expect(parseSubtypeChoice("99", "residential")).toBeNull();
  });

  it("maps Rwanda names and treats bedsitter / boys quarter as aliases", () => {
    expect(parseSubtypeChoice("studio", "residential")).toBe("studio");
    expect(parseSubtypeChoice("studio room", "residential")).toBe("studio");
    expect(parseSubtypeChoice("bedsitter", "residential")).toBe("studio");
    expect(parseSubtypeChoice("annex", "residential")).toBe("servant_quarter");
    expect(parseSubtypeChoice("boys quarter", "residential")).toBe("servant_quarter");
    expect(parseSubtypeChoice("duplex", "residential")).toBe("maisonette");
    expect(parseSubtypeChoice("self-contained", "residential")).toBe("self_contained");
  });

  it("exposes expected subtype counts", () => {
    expect(COMMERCIAL_SUBTYPES).toHaveLength(8);
    expect(RESIDENTIAL_SUBTYPES).toHaveLength(10);
    expect(HOUSE_SALE_SUBTYPES).toHaveLength(5);
    expect(LAND_SUBTYPES).toHaveLength(4);
  });

  it("parses sale subtypes", () => {
    expect(parseSubtypeChoice("1", "house_sale")).toBe("house");
    expect(parseSubtypeChoice("villa", "house_sale")).toBe("villa");
    expect(parseSubtypeChoice("plot", "land")).toBe("residential_plot");
    expect(parseSubtypeChoice("farmland", "land")).toBe("farmland");
  });

  it("maps subtypes to legacy types", () => {
    expect(legacyTypeFromSubtype("single_room")).toBe("room");
    expect(legacyTypeFromSubtype("double_room")).toBe("room");
    expect(legacyTypeFromSubtype("bedsitter")).toBe("apartment");
    expect(legacyTypeFromSubtype("servant_quarter")).toBe("room");
    expect(legacyTypeFromSubtype("self_contained")).toBe("apartment");
    expect(legacyTypeFromSubtype("two_bedroom")).toBe("apartment");
  });

  it("labels subtypes", () => {
    expect(subtypeLabel("self_contained", "en")).toMatch(/self-contained/i);
    expect(subtypeLabel("studio", "en")).toBe("Studio");
    expect(subtypeLabel("bedsitter", "en")).toBe("Studio");
    expect(subtypeLabel("servant_quarter", "en")).toBe("Annex");
    expect(subtypeLabel("maisonette", "en")).toContain("Maisonette");
  });

  it("labels categories", () => {
    expect(categoryLabel("residential", "en")).toBe("Residential");
    expect(categoryLabel("commercial", "fr")).toBe("Commercial");
    expect(categoryLabel("house_sale", "en")).toBe("House for sale");
    expect(categoryLabel("land", "fr")).toBe("Terrain à vendre");
  });

  it("formats subtype menus", () => {
    expect(formatSubtypeMenu("residential", "en")).toContain("Self-contained");
    expect(formatSubtypeMenu("residential", "en")).toContain("Studio");
    expect(formatSubtypeMenu("residential", "en")).toContain("Annex");
    expect(formatSubtypeMenu("residential", "en")).not.toMatch(/bedsitter/i);
    expect(formatSubtypeMenu("residential", "en")).not.toMatch(/boys quarter/i);
    expect(formatSubtypeMenu("commercial", "en")).toContain("Shop");
    expect(formatSubtypeMenu("house_sale", "en")).toContain("Villa");
    expect(formatSubtypeMenu("land", "en")).toContain("Plot (residential)");
  });

  it("parses electricity meter choices with REG wording", () => {
    expect(formatElectricityMeterMenu("en")).toContain("REG");
    expect(parseElectricityMeterChoice("2")).toBe("prepaid");
    expect(electricityMeterLabel("prepaid", "en")).toContain("REG");
  });
});
