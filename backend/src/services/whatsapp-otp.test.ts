import { describe, expect, it } from "vitest";
import {
  authOtpComponentVariants,
  authOtpLanguageFallbacks,
  authOtpTemplateNames,
} from "./whatsapp.js";

describe("WhatsApp OTP template helpers", () => {
  it("prefers French language codes when the app is in French", () => {
    const langs = authOtpLanguageFallbacks("fr");
    expect(langs[0]).toMatch(/^fr/i);
    expect(langs).toContain("en");
  });

  it("prefers English language codes when the app is in English", () => {
    const langs = authOtpLanguageFallbacks("en");
    expect(langs[0]).toMatch(/^en/i);
    expect(langs).toContain("en_US");
  });

  it("always includes the casa_login_code template name", () => {
    expect(authOtpTemplateNames()).toContain("casa_login_code");
  });

  it("sends the OTP in both copy-button and body-only shapes", () => {
    const variants = authOtpComponentVariants("847291");
    expect(variants).toHaveLength(2);
    const flat = JSON.stringify(variants);
    expect(flat).toContain("847291");
    expect(flat).toContain("button");
    expect(variants[1]).toHaveLength(1);
  });
});
