import { createHash } from "node:crypto";
import { query } from "../../db/pool.js";

export function adminFingerprint(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex").slice(0, 12);
}

export async function logAdminAction(
  fingerprint: string,
  action: string,
  targetType?: string,
  targetId?: string,
  details?: Record<string, unknown>
): Promise<void> {
  await query(
    `INSERT INTO admin_audit_log (admin_fingerprint, action, target_type, target_id, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [fingerprint, action, targetType ?? null, targetId ?? null, details ? JSON.stringify(details) : null]
  );
}

export interface AuditLogRow {
  id: string;
  admin_fingerprint: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: Date;
}

export async function listAuditLogs(limit = 100): Promise<AuditLogRow[]> {
  const result = await query<AuditLogRow>(
    `SELECT id, admin_fingerprint, action, target_type, target_id, details, created_at
     FROM admin_audit_log
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}
