import { describe, expect, it } from "vitest";
import { houseMatchesSearch } from "./saved-searches.js";
import { makeHouse } from "../../test/fixtures.js";

describe("saved search matching", () => {
  it("matches when all filters pass", () => {
    const house = makeHouse();
    expect(
      houseMatchesSearch(house, {
        raw_query: "kimironko apartment",
        property_category: "residential",
        property_subtype: "two_bedroom",
        max_rent: 400000,
        region: "gasabo",
        town: "Kigali",
        neighbourhood: "Kimironko",
        water: true,
        parking: true,
        electricity_meter: "prepaid",
        fenced: true,
      })
    ).toBe(true);
  });

  it("rejects when rent exceeds max", () => {
    expect(
      houseMatchesSearch(makeHouse({ rent: 120000 }), {
        raw_query: "cheap",
        max_rent: 100000,
      })
    ).toBe(false);
  });

  it("rejects commercial filter on residential listing", () => {
    expect(
      houseMatchesSearch(makeHouse(), {
        raw_query: "office",
        property_category: "commercial",
      })
    ).toBe(false);
  });

  it("matches commercial office subtype", () => {
    expect(
      houseMatchesSearch(
        makeHouse({
          property_category: "commercial",
          property_subtype: "office",
          town: "Kigali",
          city: "Kigali",
        }),
        {
          raw_query: "office kimironko",
          property_category: "commercial",
          property_subtype: "office",
          town: "Kigali",
        }
      )
    ).toBe(true);
  });

  it("rejects when electricity meter type differs", () => {
    expect(
      houseMatchesSearch(makeHouse({ electricity_meter: "prepaid" }), {
        raw_query: "postpaid",
        electricity_meter: "postpaid",
      })
    ).toBe(false);
  });

  it("falls back to legacy electricity boolean for postpaid", () => {
    expect(
      houseMatchesSearch(
        makeHouse({ electricity_meter: undefined, electricity: true }),
        { raw_query: "postpaid", electricity_meter: "postpaid" }
      )
    ).toBe(true);
  });

  it("requires standby generator when filter set", () => {
    expect(
      houseMatchesSearch(makeHouse({ standby_generator: false }), {
        raw_query: "generator",
        standby_generator: true,
      })
    ).toBe(false);
    expect(
      houseMatchesSearch(makeHouse({ standby_generator: true }), {
        raw_query: "generator",
        standby_generator: true,
      })
    ).toBe(true);
  });
});
