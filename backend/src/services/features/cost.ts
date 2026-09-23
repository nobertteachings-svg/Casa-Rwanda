import { env, isPaymentsEnabled } from "../../config/env.js";

export function calculateMoveInCost(rent: number, monthsUpfront: number): {
  rentMonthly: number;
  upfrontTotal: number;
  unlockFee: number;
  grandTotal: number;
} {
  const upfrontTotal = rent * monthsUpfront;
  const unlockFee = isPaymentsEnabled ? env.UNLOCK_FEE_RWF : 0;
  return {
    rentMonthly: rent,
    upfrontTotal,
    unlockFee,
    grandTotal: upfrontTotal + unlockFee,
  };
}

export function formatMoveInCost(
  rent: number,
  monthsUpfront: number,
  lang: "en" | "fr",
  category?: string
): string {
  const sale = category === "house_sale" || category === "land";
  const { upfrontTotal, unlockFee, grandTotal } = calculateMoveInCost(
    rent,
    sale ? 0 : monthsUpfront
  );
  if (sale) {
    const feeLine =
      unlockFee > 0
        ? lang === "fr"
          ? `• Frais de déblocage Casa: ${unlockFee.toLocaleString()} RWF\n`
          : `• Casa unlock fee: ${unlockFee.toLocaleString()} RWF\n`
        : "";
    const total = rent + unlockFee;
    return lang === "fr"
      ? `💰 *Prix demandé:*\n` +
          `• Prix: ${rent.toLocaleString()} RWF\n` +
          feeLine +
          `━━━━━━━━━━━━━━━━\n` +
          `*Total: ${total.toLocaleString()} RWF*`
      : `💰 *Asking price:*\n` +
          `• Price: ${rent.toLocaleString()} RWF\n` +
          feeLine +
          `━━━━━━━━━━━━━━━━\n` +
          `*Total: ${total.toLocaleString()} RWF*`;
  }
  if (lang === "fr") {
    const feeLine = isPaymentsEnabled
      ? `• Frais de déblocage Casa: ${unlockFee.toLocaleString()} RWF\n`
      : "";
    return (
      `💰 *Coût total pour emménager:*\n` +
      `• Loyer: ${rent.toLocaleString()} RWF/mois\n` +
      `• Avance (${monthsUpfront} mois): ${upfrontTotal.toLocaleString()} RWF\n` +
      feeLine +
      `━━━━━━━━━━━━━━━━\n` +
      `*Total: ${grandTotal.toLocaleString()} RWF*`
    );
  }
  const feeLine = isPaymentsEnabled
    ? `• Casa unlock fee: ${unlockFee.toLocaleString()} RWF\n`
    : "";
  return (
    `💰 *Total cost to move in:*\n` +
    `• Rent: ${rent.toLocaleString()} RWF/month\n` +
    `• Upfront (${monthsUpfront} months): ${upfrontTotal.toLocaleString()} RWF\n` +
    feeLine +
    `━━━━━━━━━━━━━━━━\n` +
    `*Total: ${grandTotal.toLocaleString()} RWF*`
  );
}
