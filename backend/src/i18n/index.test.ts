import { describe, expect, it } from "vitest";
import { parseLanguageChoice, parseRoleChoice, t } from "../i18n/index.js";

describe("i18n", () => {
  it("always returns the English message bundle", () => {
    expect(t("en").welcome).toContain("Casa Rwanda");
    expect(t("fr").welcome).toBe(t("en").welcome);
    expect(t("en").chooseLanguage).not.toMatch(/Français/);
  });

  it("parses language choices", () => {
    expect(parseLanguageChoice("1")).toBe("en");
    expect(parseLanguageChoice("english")).toBe("en");
    expect(parseLanguageChoice("2")).toBe("fr");
    expect(parseLanguageChoice("français")).toBe("fr");
    expect(parseLanguageChoice("español")).toBeNull();
  });

  it("parses role choices in EN and FR", () => {
    expect(parseRoleChoice("1")).toBe("landlord");
    expect(parseRoleChoice("I am a landlord")).toBe("landlord");
    expect(parseRoleChoice("propriétaire")).toBe("landlord");
    expect(parseRoleChoice("2")).toBe("tenant");
    expect(parseRoleChoice("locataire")).toBe("tenant");
    expect(parseRoleChoice("admin")).toBeNull();
  });
});
