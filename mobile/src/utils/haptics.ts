import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

async function safe(run: () => Promise<void>): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await run();
  } catch {
    /* device may not support haptics */
  }
}

/** Light tap — tab switches, toggles */
export function hapticLight(): void {
  void safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** Medium — save to shortlist */
export function hapticMedium(): void {
  void safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

/** Success — unlock, completed actions */
export function hapticSuccess(): void {
  void safe(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  );
}
