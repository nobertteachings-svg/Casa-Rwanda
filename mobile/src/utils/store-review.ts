import * as StoreReview from "expo-store-review";
import {
  hasRequestedAppReview,
  markAppReviewRequested,
  markFirstUnlockComplete,
  wasFirstUnlockCompleted,
} from "../storage/app-settings";

/** Prompt Play Store / App Store review once after the user's first successful unlock. */
export async function maybeRequestReviewAfterFirstUnlock(): Promise<void> {
  const alreadyUnlocked = await wasFirstUnlockCompleted();
  if (alreadyUnlocked) return;

  await markFirstUnlockComplete();

  const reviewAsked = await hasRequestedAppReview();
  if (reviewAsked) return;

  const available = await StoreReview.isAvailableAsync();
  if (!available) return;

  await StoreReview.requestReview();
  await markAppReviewRequested();
}
