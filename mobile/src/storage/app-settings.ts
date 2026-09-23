import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_KEY = "casa:onboarding-done";
const LOW_DATA_KEY = "casa:low-data-mode";

export async function hasCompletedOnboarding(role: string): Promise<boolean> {
  const v = await AsyncStorage.getItem(`${ONBOARDING_KEY}:${role}`);
  return v === "1";
}

export async function setOnboardingComplete(role: string): Promise<void> {
  await AsyncStorage.setItem(`${ONBOARDING_KEY}:${role}`, "1");
}

export async function getLowDataMode(): Promise<boolean> {
  return (await AsyncStorage.getItem(LOW_DATA_KEY)) === "1";
}

export async function setLowDataMode(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(LOW_DATA_KEY, enabled ? "1" : "0");
}

const THEME_KEY = "casa:theme-mode";

export type ThemeMode = "light" | "dark" | "system";

export async function getThemeMode(): Promise<ThemeMode> {
  const v = await AsyncStorage.getItem(THEME_KEY);
  if (v === "light" || v === "dark" || v === "system") return v;
  return "system";
}

export async function setThemeMode(mode: ThemeMode): Promise<void> {
  await AsyncStorage.setItem(THEME_KEY, mode);
}

const FIRST_UNLOCK_KEY = "casa:first-unlock-done";
const REVIEW_REQUESTED_KEY = "casa:app-review-requested";

export async function wasFirstUnlockCompleted(): Promise<boolean> {
  return (await AsyncStorage.getItem(FIRST_UNLOCK_KEY)) === "1";
}

export async function markFirstUnlockComplete(): Promise<void> {
  await AsyncStorage.setItem(FIRST_UNLOCK_KEY, "1");
}

export async function hasRequestedAppReview(): Promise<boolean> {
  return (await AsyncStorage.getItem(REVIEW_REQUESTED_KEY)) === "1";
}

export async function markAppReviewRequested(): Promise<void> {
  await AsyncStorage.setItem(REVIEW_REQUESTED_KEY, "1");
}
