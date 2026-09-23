import { en, type Language, type Messages } from "./messages.js";

export function t(_lang: Language): Messages {
  // Casa Rwanda is English-only. French message tables stay unused.
  return en;
}

export function parseLanguageChoice(input: string): Language | null {
  const normalized = input.trim().toLowerCase();
  if (normalized === "1" || normalized === "english" || normalized === "en") {
    return "en";
  }
  if (normalized === "2" || normalized === "français" || normalized === "francais" || normalized === "fr") {
    return "fr";
  }
  return null;
}

export function parseRoleChoice(input: string): "landlord" | "tenant" | null {
  const normalized = input.trim().toLowerCase();
  if (normalized === "1" || normalized.includes("landlord") || normalized.includes("propriétaire") || normalized.includes("proprietaire")) {
    return "landlord";
  }
  if (normalized === "2" || normalized.includes("tenant") || normalized.includes("locataire")) {
    return "tenant";
  }
  return null;
}
