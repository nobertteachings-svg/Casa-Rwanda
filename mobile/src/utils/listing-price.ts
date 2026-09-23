import { isSaleCategory } from "../constants/property-types";
import type { Strings } from "../i18n/strings";

export function listingPriceLabel(
  amount: number,
  category: string | undefined,
  m: Strings
): string {
  return isSaleCategory(category) ? m.browseSalePrice(amount) : m.browseRent(amount);
}
