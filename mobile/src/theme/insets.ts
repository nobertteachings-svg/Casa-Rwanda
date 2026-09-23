import { Platform, StatusBar } from "react-native";

/** Keep content clear of the status bar and the phone Back / Home / Menu bar. */
export function screenInsets(): { top: number; bottom: number } {
  if (Platform.OS === "android") {
    return {
      top: (StatusBar.currentHeight ?? 24) + 6,
      bottom: 56,
    };
  }
  return { top: 54, bottom: 28 };
}
