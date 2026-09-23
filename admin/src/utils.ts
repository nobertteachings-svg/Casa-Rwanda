export function formatMoney(amount: number): string {
  return `RWF ${amount.toLocaleString("en-UG")}`;
}

/** @deprecated Use formatMoney */
export const formatNgn = formatMoney;
export const formatRwf = formatMoney;

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-UG", {
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
