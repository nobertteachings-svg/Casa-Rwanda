export interface DashboardStats {
  users: {
    total: number;
    landlords: number;
    tenants: number;
    newToday: number;
    newThisWeek: number;
  };
  listings: {
    total: number;
    active: number;
    flagged: number;
    underReview: number;
    inactive: number;
    newToday: number;
  };
  revenue: {
    totalUnlocks: number;
    totalEarningsUgx: number;
    unlocksToday: number;
    earningsTodayUgx: number;
    unlocksThisMonth: number;
    earningsThisMonthUgx: number;
    unlockFeeRwf: number;
  };
  moderation: { pendingReviews: number };
  topNeighbourhoods: Array<{ neighbourhood: string; count: number }>;
  recentUnlocks: UnlockRow[];
  charts?: ChartSeries;
  ops?: OpsMetrics;
  badges?: NavBadges;
  health?: { whatsapp: boolean };
}

export interface ChartSeries {
  signupsByDay: Array<{ date: string; landlords: number; tenants: number }>;
  unlocksByDay: Array<{ date: string; count: number; revenue_kes: number }>;
  listingsByRegion: Array<{ region: string; count: number }>;
  funnel: { searches: number; listingViews: number; unlocks: number };
}

export interface OpsMetrics {
  lastWebhookAt: string | null;
  messagesLast24h: number;
  aiFailuresLast24h: number;
}

export interface NavBadges {
  moderation: number;
  verifications: number;
  payments_disputed: number;
}

export interface UserRow {
  phone: string;
  role: string;
  language: string;
  display_name: string | null;
  created_at: string;
  listing_count: number;
  unlock_count: number;
  verified?: boolean;
  suspended?: boolean;
}

export interface UserDetail extends UserRow {
  verification_method: string | null;
  suspended_reason: string | null;
  listings: Array<{ house_id: string; rent: number; status: string; neighbourhood: string | null }>;
  unlocks: Array<{ house_id: string; amount_paid: number; paid_at: string }>;
  risk: LandlordRisk | null;
}

export interface HouseRow {
  house_id: string;
  landlord_phone: string;
  type: string;
  rent: number;
  neighbourhood: string | null;
  city: string | null;
  region?: string | null;
  property_category?: string | null;
  property_subtype?: string | null;
  status: string;
  created_at: string;
  review_count: number;
}

export interface HouseDetail {
  house: {
    house_id: string;
    landlord_phone: string;
    type: string;
    property_category?: string;
    property_subtype?: string;
    region?: string | null;
    town?: string | null;
    rent: number;
    latitude: number;
    longitude: number;
    neighbourhood: string | null;
    city: string | null;
    electricity_meter?: string;
    photos: string[];
    videos: string[];
    status: string;
    trust_tier?: string;
    ai_description?: string | null;
    created_at: string;
  };
  risk: LandlordRisk;
  reviews: ReviewRow[];
}

export interface ReviewRow {
  id: string;
  house_id: string;
  review_type: string;
  severity: string;
  message: string;
  resolved: boolean;
  created_at: string;
  neighbourhood: string | null;
  landlord_phone: string;
  house_status: string;
}

export interface IdVerification {
  id: string;
  landlord_phone: string;
  media_reference: string;
  media_reference_back?: string | null;
  full_name: string | null;
  document_type: string | null;
  id_number: string | null;
  expiry_date: string | null;
  status: string;
  rejection_reason: string | null;
  claude_analysis: {
    confidence?: string;
    is_valid_id?: boolean;
    rejection_reason?: string | null;
  } | null;
  created_at: string;
  listing_count: number;
}

export interface InboxItem {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  target_id: string;
  created_at: string;
  meta?: Record<string, unknown>;
}

export interface LandlordRisk {
  phone: string;
  level: "low" | "medium" | "high";
  flaggedListings: number;
  totalListings: number;
  unresolvedReviews: number;
  duplicateGpsCount: number;
  duplicateRentAreaCount: number;
  unlockCount: number;
  reasons: string[];
}

export interface PaymentRow {
  id: string;
  tenant_phone: string;
  house_id: string;
  amount_paid: number;
  payment_method: string | null;
  paid_at: string;
  disputed: boolean;
  dispute_reason: string | null;
  refund_flagged: boolean;
  neighbourhood: string | null;
}

export interface UnlockRow {
  id: string;
  tenant_phone: string;
  house_id: string;
  amount_paid: number;
  payment_method: string | null;
  paid_at: string;
}

export interface AuditLogRow {
  id: string;
  admin_fingerprint: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface ListingAiReview {
  risk_level: string;
  recommendation: string;
  summary: string;
  flags: string[];
  confidence: string;
}

export interface MarketInsight {
  medianRentByArea: Array<{ area: string; property_subtype: string; median_rent: number; count: number }>;
  topSearchAreas: Array<{ query_text: string; count: number }>;
  supplyDemand: Array<{ area: string; listings: number; searches: number }>;
}

/** Local domain contracts (kept in-admin so Railway/rootless builds do not need ../packages). */
export type HouseStatus = "active" | "inactive" | "flagged" | "under_review";

export type UserRole = "landlord" | "tenant";

export interface PublicListingCard {
  id: string;
  title: string;
  neighbourhood: string | null;
  city: string | null;
  region: string | null;
  rentUgx: number | null;
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

