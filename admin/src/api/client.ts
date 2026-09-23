import type {
  AuditLogRow,
  DashboardStats,
  HouseDetail,
  HouseRow,
  IdVerification,
  InboxItem,
  ListingAiReview,
  MarketInsight,
  NavBadges,
  PaymentRow,
  ReviewRow,
  UserDetail,
  UserRow,
} from "../types";

const SESSION_STORAGE = "casa_admin_session";
const SESSION_EXP_STORAGE = "casa_admin_session_exp";

export function getSessionToken(): string | null {
  return sessionStorage.getItem(SESSION_STORAGE);
}

/** @deprecated Use getSessionToken — kept for route guards during migration */
export function getApiKey(): string | null {
  return getSessionToken();
}

export function setSessionToken(token: string, expiresAt: string): void {
  sessionStorage.setItem(SESSION_STORAGE, token);
  sessionStorage.setItem(SESSION_EXP_STORAGE, expiresAt);
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_STORAGE);
  sessionStorage.removeItem(SESSION_EXP_STORAGE);
}

/** @deprecated Use clearSession */
export function clearApiKey(): void {
  clearSession();
}

function getApiBase(): string {
  const runtime = window.__RUNTIME_CONFIG__?.VITE_API_URL;
  const built = import.meta.env.VITE_API_URL as string | undefined;
  return (runtime || built || "").replace(/\/$/, "");
}

function apiUrlError(): string {
  return "Backend API URL is not configured.";
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getSessionToken();
  if (!token) throw new Error("Not authenticated");
  const apiBase = getApiBase();
  if (!apiBase) throw new Error(apiUrlError());

  let res: Response;
  try {
    res = await fetch(`${apiBase}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
  } catch {
    throw new Error("Cannot reach the backend API. Check ADMIN_ORIGIN and redeploy backend.");
  }

  const text = await res.text();
  if (res.status === 401) {
    clearSession();
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    let body: { error?: string } = {};
    try {
      body = JSON.parse(text) as { error?: string };
    } catch {
      /* */
    }
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Invalid response from API");
  }
}

function mediaUrl(ref: string): string {
  const base = getApiBase();
  return `${base}/api/admin/media?ref=${encodeURIComponent(ref)}`;
}

export async function loginWithApiKey(apiKey: string): Promise<void> {
  const apiBase = getApiBase();
  if (!apiBase) throw new Error(apiUrlError());

  let res: Response;
  try {
    res = await fetch(`${apiBase}/api/admin/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey }),
    });
  } catch {
    throw new Error("Cannot reach the backend API. Check ADMIN_ORIGIN and redeploy backend.");
  }

  const text = await res.text();
  if (!res.ok) {
    let body: { error?: string } = {};
    try {
      body = JSON.parse(text) as { error?: string };
    } catch {
      /* */
    }
    throw new Error(body.error ?? "Invalid API key");
  }

  const data = JSON.parse(text) as { token: string; expiresAt: string };
  setSessionToken(data.token, data.expiresAt);
}

export async function logout(): Promise<void> {
  const token = getSessionToken();
  if (token) {
    const apiBase = getApiBase();
    if (apiBase) {
      try {
        await fetch(`${apiBase}/api/admin/session`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        /* best effort */
      }
    }
  }
  clearSession();
}

export const api = {
  mediaUrl,
  loginWithApiKey,
  logout,
  verifyKey: () => request<DashboardStats>("/api/admin/stats"),
  getStats: () => request<DashboardStats>("/api/admin/stats"),
  getBadges: () => request<NavBadges>("/api/admin/badges"),
  search: (q: string) => request<{ users: UserRow[]; houses: HouseRow[] }>(`/api/admin/search?q=${encodeURIComponent(q)}`),

  getUsers: (page = 1, filters?: Record<string, string>) => {
    const params = new URLSearchParams({ page: String(page) });
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        // Skip empty / "all" so the API applies no filter for that field
        if (v && v !== "all") params.set(k, v);
      });
    }
    return request<{ users: UserRow[]; total: number }>(`/api/admin/users?${params}`);
  },
  getUser: (phone: string) => request<UserDetail>(`/api/admin/users/${encodeURIComponent(phone)}`),
  verifyUser: (phone: string) =>
    request<{ ok: boolean }>(`/api/admin/users/${encodeURIComponent(phone)}/verify`, { method: "PATCH" }),
  suspendUser: (phone: string, suspended: boolean, reason?: string) =>
    request<{ ok: boolean }>(`/api/admin/users/${encodeURIComponent(phone)}/suspend`, {
      method: "PATCH",
      body: JSON.stringify({ suspended, reason }),
    }),

  getHouses: (page = 1, filters?: Record<string, string>) => {
    const params = new URLSearchParams({ page: String(page) });
    if (filters) Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
    return request<{ houses: HouseRow[]; total: number }>(`/api/admin/houses?${params}`);
  },
  getHouse: (id: string) => request<HouseDetail>(`/api/admin/houses/${id}`),
  updateHouseStatus: (houseId: string, status: string) =>
    request<{ ok: boolean }>(`/api/admin/houses/${houseId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  aiReviewHouse: (houseId: string) =>
    request<ListingAiReview>(`/api/admin/houses/${houseId}/ai-review`, { method: "POST" }),
  repairHousePhotos: (houseId: string) =>
    request<{ ok: boolean; photos: string[]; videos: string[]; promoted: number; removed: number }>(
      `/api/admin/houses/${houseId}/photos/repair`,
      { method: "POST" }
    ),
  replaceHousePhotos: (houseId: string, imageUrls: string[]) =>
    request<{ ok: boolean; photos: string[] }>(`/api/admin/houses/${houseId}/photos`, {
      method: "PUT",
      body: JSON.stringify({ imageUrls }),
    }),

  getReviews: (resolved = false) =>
    request<{ reviews: ReviewRow[] }>(`/api/admin/reviews?resolved=${resolved}`),
  getInbox: () => request<{ items: InboxItem[] }>("/api/admin/inbox"),
  resolveReview: (reviewId: string) =>
    request<{ ok: boolean }>(`/api/admin/reviews/${reviewId}/resolve`, { method: "PATCH" }),

  getVerifications: () => request<{ verifications: IdVerification[] }>("/api/admin/id-verifications"),
  approveVerification: (id: string) =>
    request<{ ok: boolean }>(`/api/admin/id-verifications/${id}/approve`, { method: "PATCH" }),
  rejectVerification: (id: string, reason: string) =>
    request<{ ok: boolean }>(`/api/admin/id-verifications/${id}/reject`, {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    }),
  aiReviewVerification: (id: string) =>
    request(`/api/admin/id-verifications/${id}/ai-review`, { method: "POST" }),
  aiReviewAllVerifications: () =>
    request<{ results: unknown[] }>("/api/admin/id-verifications/ai-review-all", { method: "POST" }),

  getPayments: (page = 1, filters?: Record<string, string>) => {
    const params = new URLSearchParams({ page: String(page) });
    if (filters) Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
    return request<{ payments: PaymentRow[]; total: number; byMethod: Record<string, number> }>(
      `/api/admin/payments?${params}`
    );
  },
  disputePayment: (id: string, reason: string, flagRefund: boolean) =>
    request<{ ok: boolean }>(`/api/admin/payments/${id}/dispute`, {
      method: "PATCH",
      body: JSON.stringify({ reason, flagRefund }),
    }),

  getSettings: () => request<{ unlockFeeRwf: number }>("/api/admin/settings"),
  setUnlockFee: (unlockFeeRwf: number) =>
    request<{ ok: boolean }>("/api/admin/settings/unlock-fee", {
      method: "PATCH",
      body: JSON.stringify({ unlockFeeRwf }),
    }),

  getInsights: () => request<MarketInsight>("/api/admin/insights"),
  getAuditLog: () => request<{ logs: AuditLogRow[] }>("/api/admin/audit-log"),

  exportCsv: async (type: "users" | "houses" | "unlocks") => {
    const token = getSessionToken();
    const base = getApiBase();
    const res = await fetch(`${base}/api/admin/export/${type}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `casa-${type}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
