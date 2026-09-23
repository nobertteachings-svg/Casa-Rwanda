import * as SecureStore from "expo-secure-store";
import type { Language } from "../api/client";

const LANG_KEY = "casa_ui_language";

export async function saveLanguagePref(lang: Language): Promise<void> {
  await SecureStore.setItemAsync(LANG_KEY, lang);
}

export async function loadLanguagePref(): Promise<Language | null> {
  const v = await SecureStore.getItemAsync(LANG_KEY);
  if (v === "en" || v === "fr") return v;
  return null;
}

export async function clearLanguagePref(): Promise<void> {
  await SecureStore.deleteItemAsync(LANG_KEY);
}
