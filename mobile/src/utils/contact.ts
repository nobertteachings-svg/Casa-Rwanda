import { Linking, Platform } from "react-native";

export function openDirections(latitude: number, longitude: number): void {
  const label = encodeURIComponent("Casa listing");
  if (Platform.OS === "ios") {
    void Linking.openURL(`http://maps.apple.com/?daddr=${latitude},${longitude}&q=${label}`);
    return;
  }
  if (Platform.OS === "android") {
    void Linking.openURL(`google.navigation:q=${latitude},${longitude}`).catch(() => {
      void Linking.openURL(`https://maps.google.com/?q=${latitude},${longitude}`);
    });
    return;
  }
  void Linking.openURL(`https://maps.google.com/?q=${latitude},${longitude}`);
}

export function callPhone(phone: string): void {
  void Linking.openURL(`tel:+${phone.replace(/\D/g, "")}`);
}

export function openWhatsApp(phone: string, message?: string): void {
  const digits = phone.replace(/\D/g, "");
  const url = message
    ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${digits}`;
  void Linking.openURL(url);
}

export function openHttpUrl(url: string): void {
  void Linking.openURL(url);
}
