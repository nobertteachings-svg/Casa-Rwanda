/**
 * Shared domain types used across Casa packages (admin, marketing, backend contracts).
 * Keep this package dependency-free so frontends can import without pulling Node APIs.
 */

export type HouseStatus = "active" | "inactive" | "flagged" | "under_review";

export type UserRole = "landlord" | "tenant";

export interface PublicListingCard {
  id: string;
  title: string;
  neighbourhood: string | null;
  city: string | null;
  region: string | null;
  rentKes: number | null;
  category: string | null;
  photoUrl: string | null;
}

export interface PublicStats {
  listings: {
    available: number;
    residential: number;
    commercial: number;
  };
  users: {
    tenants: number;
    landlords: number;
  };
}

export interface HealthSnapshot {
  status: "ok" | "degraded" | "error";
  postgres?: boolean;
  redis?: boolean;
  whatsapp?: boolean;
  queue?: {
    queued: number;
    processing: number;
    dlq: number;
  };
  timestamp?: string;
}
