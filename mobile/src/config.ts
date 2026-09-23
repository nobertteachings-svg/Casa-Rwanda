/** Backend base URL — set EXPO_PUBLIC_API_URL in EAS / .env */
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "https://api.casahomesrwanda.com";

export function mediaUrl(ref: string, kind: "image" | "video" = "image"): string {
  const params = new URLSearchParams({ ref, kind });
  return `${API_URL}/api/public/media?${params}`;
}
