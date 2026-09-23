import type { LandlordRisk } from "../types";

export function RiskBadge({ risk }: { risk?: LandlordRisk | null }) {
  if (!risk) return null;
  return (
    <span className={`risk-badge risk-${risk.level}`} title={risk.reasons.join(", ")}>
      {risk.level} risk
    </span>
  );
}
