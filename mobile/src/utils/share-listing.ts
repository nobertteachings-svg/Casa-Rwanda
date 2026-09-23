import * as Linking from "expo-linking";
import * as Sharing from "expo-sharing";
import { Share } from "react-native";
import type { Language } from "../api/client";

export function listingDeepLink(houseId: string): string {
  return Linking.createURL(`listing/${houseId}`);
}

export function listingWebShareUrl(houseId: string): string {
  return `https://www.casahomesrwanda.com/listing/${houseId.toUpperCase()}`;
}

export function listingAppDeepLink(houseId: string): string {
  return `casarw://listing/${houseId.toUpperCase()}`;
}

export async function shareListing(
  houseId: string,
  type: string,
  rent: number,
  lang: Language,
  category?: string
): Promise<void> {
  const id = houseId.toUpperCase();
  const web = listingWebShareUrl(id);
  const app = listingAppDeepLink(id);
  const sale = category === "house_sale" || category === "land";
  const price = sale
    ? `${rent.toLocaleString()} RWF`
    : lang === "fr"
      ? `${rent.toLocaleString()} RWF/mois`
      : `${rent.toLocaleString()} RWF/month`;
  const message =
    lang === "fr"
      ? `🏠 ${type} — ${price} sur Casa\n\nOuvrir dans l'app:\n${app}\n\n${web}`
      : `🏠 ${type} — ${price} on Casa\n\nOpen in app:\n${app}\n\n${web}`;
  await Share.share({ message, url: web });
}

export async function shareText(title: string, body: string): Promise<void> {
  if (await Sharing.isAvailableAsync()) {
    await Share.share({ message: `${title}\n\n${body}` });
  } else {
    await Share.share({ message: `${title}\n\n${body}` });
  }
}
