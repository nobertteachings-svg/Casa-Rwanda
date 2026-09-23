import { isPaymentsEnabled } from "../config/env.js";
import type { Language } from "../i18n/messages.js";
import type { House } from "./houses.js";
import { checkUnlockAllowed } from "./features/unlock-limits.js";
import { getAvailableCredits } from "./features/referrals.js";
import { hasUnlocked, recordUnlock } from "./features/unlocks.js";
import { getUnlockFee } from "./admin/platform.js";
import { calculateMoveInCost } from "./features/cost.js";

export interface UnlockQuote {
  houseId: string;
  paymentsEnabled: boolean;
  alreadyUnlocked: boolean;
  unlockFeeRwf: number;
  creditsAvailable: number;
  unlockLimit: { usedToday: number; limit: number; allowed: boolean };
  reference: string;
  canUnlockInstantly: boolean;
  moveInCost: ReturnType<typeof calculateMoveInCost>;
}

export async function getUnlockQuote(
  tenantPhone: string,
  house: House
): Promise<UnlockQuote> {
  const unlockLimit = await checkUnlockAllowed(tenantPhone);
  const alreadyUnlocked = await hasUnlocked(tenantPhone, house.house_id);
  const creditsAvailable = isPaymentsEnabled ? await getAvailableCredits(tenantPhone) : 0;
  const unlockFeeRwf = isPaymentsEnabled ? await getUnlockFee() : 0;
  const canUnlockInstantly = alreadyUnlocked || !isPaymentsEnabled || creditsAvailable > 0;

  return {
    houseId: house.house_id,
    paymentsEnabled: isPaymentsEnabled,
    alreadyUnlocked,
    unlockFeeRwf: unlockFeeRwf,
    creditsAvailable,
    unlockLimit,
    reference: house.house_id,
    canUnlockInstantly,
    moveInCost: calculateMoveInCost(house.rent, house.months_upfront),
  };
}

export type AppUnlockResult =
  | { ok: true; unlocked: true; usedCredit: boolean; amountPaid: number }
  | { ok: false; unlocked: false; reason: "unavailable" | "limit" | "payment_required"; quote: UnlockQuote }
  | { ok: false; unlocked: false; reason: "failed" };

export async function executeAppUnlock(
  tenantPhone: string,
  house: House,
  _lang: Language,
  opts: { beneficiaryPhone?: string; confirmPaid?: boolean }
): Promise<AppUnlockResult> {
  const quote = await getUnlockQuote(tenantPhone, house);

  if (quote.alreadyUnlocked) {
    return { ok: true, unlocked: true, usedCredit: false, amountPaid: 0 };
  }

  if (!quote.unlockLimit.allowed) {
    return { ok: false, unlocked: false, reason: "limit", quote };
  }

  if (quote.paymentsEnabled && quote.creditsAvailable === 0 && !opts.confirmPaid) {
    return { ok: false, unlocked: false, reason: "payment_required", quote };
  }

  if (house.status && house.status !== "active") {
    return { ok: false, unlocked: false, reason: "unavailable", quote };
  }

  await recordUnlock({
    tenantPhone,
    houseId: house.house_id,
    amountPaid: 0,
    beneficiaryPhone: opts.beneficiaryPhone,
  });

  return { ok: true, unlocked: true, usedCredit: false, amountPaid: 0 };
}

export function momoPaymentInstructions(
  houseId: string,
  feeUgx: number,
  _lang: Language
): string {
  return `Pay RWF ${feeUgx.toLocaleString()} via Mobile Money / Paystack with reference ${houseId}, then tap "I've paid".`;
}

