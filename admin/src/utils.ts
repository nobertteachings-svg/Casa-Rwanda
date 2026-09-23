export function formatMoney(amount: number): string {
  return `RWF ${amount.toLocaleString("en-RW")}`;
}

export const formatRwf = formatMoney;

export function isSaleCategory(category?: string | null): boolean {
  return category === "house_sale" || category === "land";
}

export function formatListingPrice(amount: number, category?: string | null): string {
  const price = formatRwf(amount);
  return isSaleCategory(category) ? price : `${price}/mo`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-RW", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function statusClass(status: string): string {
  return `badge badge-${status.replace("_", "-")}`;
}
