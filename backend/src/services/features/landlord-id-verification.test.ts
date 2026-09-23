import { describe, expect, it } from "vitest";
import {
  canFinalizeFromFrontOnly,
  decideOutcome,
  mergeIdScans,
  type IdScanResult,
} from "./landlord-id-verification.js";

function scan(overrides: Partial<IdScanResult> = {}): IdScanResult {
  return {
    is_valid_id: true,
    document_type: "national_id",
    is_rwanda_document: true,
    full_name: "Jean Dupont",
    id_number: "123",
    expiry_date: "2030-01-01",
    is_expired: false,
    confidence: "high",
    rejection_reason: null,
    ...overrides,
  };
}

describe("decideOutcome", () => {
  it("approves when name is readable", () => {
    const outcome = decideOutcome(
      scan({
        document_type: "other",
        id_number: null,
        expiry_date: null,
      }),
      "en"
    );
    expect(outcome.status).toBe("approved");
    expect(outcome.message).toContain("Jean Dupont");
  });

  it("rejects only when name cannot be read", () => {
    const outcome = decideOutcome(scan({ full_name: "   ", expiry_date: null }), "en");
    expect(outcome.status).toBe("rejected");
    expect(outcome.message).toMatch(/name/i);
  });
});

describe("mergeIdScans", () => {
  it("combines name from front with id number and expiry from back", () => {
    const merged = mergeIdScans(
      scan({
        full_name: "Jean Dupont",
        id_number: null,
        expiry_date: null,
        side: "front",
      }),
      scan({
        full_name: null,
        id_number: "A1234567",
        expiry_date: "2028-06-15",
        side: "back",
      })
    );
    expect(merged?.full_name).toBe("Jean Dupont");
    expect(merged?.id_number).toBe("A1234567");
    expect(merged?.expiry_date).toBe("2028-06-15");
    expect(merged?.side).toBe("both");
  });
});

describe("canFinalizeFromFrontOnly", () => {
  it("allows any document with a readable name", () => {
    expect(canFinalizeFromFrontOnly(scan({ document_type: "national_id" }))).toBe(true);
    expect(canFinalizeFromFrontOnly(scan({ document_type: "other" }))).toBe(true);
    expect(canFinalizeFromFrontOnly(scan({ document_type: "passport" }))).toBe(true);
  });

  it("requires a readable name", () => {
    expect(canFinalizeFromFrontOnly(scan({ full_name: null }))).toBe(false);
    expect(canFinalizeFromFrontOnly(scan({ full_name: "  " }))).toBe(false);
  });
});
