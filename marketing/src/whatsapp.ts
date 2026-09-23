/** Casa Rwanda WhatsApp Business number. */
export const CASA_WHATSAPP_PHONE = "250735496786";

const PLACEHOLDER_PHONES = new Set([
  "250788000000",
  "250700000000",
  "15556677919",
]);

export function casaWhatsAppPhone(raw?: string): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length >= 11 && !PLACEHOLDER_PHONES.has(digits)) return digits;
  return CASA_WHATSAPP_PHONE;
}

export function casaWhatsAppDisplay(phone = CASA_WHATSAPP_PHONE): string {
  if (phone.startsWith("250") && phone.length >= 12) {
    return `+250 ${phone.slice(3, 6)} ${phone.slice(6, 9)} ${phone.slice(9)}`;
  }
  return `+${phone}`;
}

export function casaWhatsAppUrl(message?: string): string {
  const phone = casaWhatsAppPhone();
  if (!message) return `https://wa.me/${phone}`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
