import * as Linking from "expo-linking";

/** Extract CASA listing id from app scheme or marketing URLs shared on WhatsApp. */
export function parseListingIdFromUrl(url: string): string | null {
  if (!url.trim()) return null;

  try {
    const parsed = Linking.parse(url);
    const path = (parsed.path ?? "").replace(/^\//, "");

    // casarw://listing/CASA-1234 or exp://…/--/listing/CASA-1234
    const listingMatch = path.match(/^listing\/?(.+)$/i);
    if (listingMatch?.[1]) {
      return normalizeHouseId(listingMatch[1]);
    }

    // Query ?houseId=CASA-1234
    const q = parsed.queryParams?.houseId ?? parsed.queryParams?.id;
    if (typeof q === "string" && q.length > 0) {
      return normalizeHouseId(q);
    }

    // Fallback: scan full URL for /listing/CASA-XXXX
    const urlMatch = url.match(/\/listing\/([A-Za-z0-9-]+)/i);
    if (urlMatch?.[1]) {
      return normalizeHouseId(urlMatch[1]);
    }
  } catch {
    /* ignore malformed URLs */
  }

  return null;
}

function normalizeHouseId(raw: string): string {
  return decodeURIComponent(raw).split(/[?#]/)[0].toUpperCase();
}
