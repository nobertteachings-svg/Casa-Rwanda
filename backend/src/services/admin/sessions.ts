import { createHash, randomBytes } from "node:crypto";
import { redis } from "../../redis/client.js";

const SESSION_PREFIX = "casa:admin:session:";
const SESSION_TTL_SEC = 8 * 60 * 60;

export interface AdminSession {
  token: string;
  expiresAt: string;
}

export function adminFingerprintFromSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex").slice(0, 12);
}

export async function createAdminSession(): Promise<AdminSession> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_SEC * 1000).toISOString();

  if (redis.status === "ready") {
    await redis.set(
      `${SESSION_PREFIX}${token}`,
      JSON.stringify({ fingerprint: adminFingerprintFromSecret(token) }),
      "EX",
      SESSION_TTL_SEC
    );
  }

  return { token, expiresAt };
}

export async function validateAdminSession(token: string): Promise<string | null> {
  if (!token || redis.status !== "ready") return null;

  const raw = await redis.get(`${SESSION_PREFIX}${token}`);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { fingerprint?: string };
    return parsed.fingerprint ?? adminFingerprintFromSecret(token);
  } catch {
    return adminFingerprintFromSecret(token);
  }
}

export async function revokeAdminSession(token: string): Promise<void> {
  if (!token || redis.status !== "ready") return;
  await redis.del(`${SESSION_PREFIX}${token}`);
}
