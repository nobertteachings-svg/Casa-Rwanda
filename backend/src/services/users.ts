import { query } from "../db/pool.js";
import type { Language, UserRole } from "../i18n/messages.js";

export interface User {
  phone: string;
  role: UserRole;
  language: Language;
  display_name: string | null;
  created_at: Date;
}

export async function findUser(phone: string): Promise<User | null> {
  const result = await query<User>(
    "SELECT phone, role, language, display_name, created_at FROM users WHERE phone = $1",
    [phone]
  );
  return result.rows[0] ?? null;
}

export async function isUserSuspended(phone: string): Promise<boolean> {
  const result = await query<{ suspended: boolean }>(
    "SELECT COALESCE(suspended, FALSE) AS suspended FROM users WHERE phone = $1",
    [phone]
  );
  return result.rows[0]?.suspended ?? false;
}

export async function createUser(
  phone: string,
  role: UserRole,
  language: Language,
  displayName?: string
): Promise<User> {
  const name = displayName?.trim().slice(0, 100) || null;
  const result = await query<User>(
    `INSERT INTO users (phone, role, language, display_name)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (phone) DO UPDATE SET
       role = EXCLUDED.role,
       language = EXCLUDED.language,
       display_name = COALESCE(NULLIF(TRIM(users.display_name), ''), EXCLUDED.display_name),
       updated_at = NOW()
     RETURNING phone, role, language, display_name, created_at`,
    [phone, role, language, name]
  );
  return result.rows[0];
}

/** Save WhatsApp profile name when the user has no display name yet. */
export async function syncWhatsAppDisplayName(
  phone: string,
  name?: string
): Promise<void> {
  const trimmed = name?.trim().slice(0, 100);
  if (!trimmed) return;

  await query(
    `UPDATE users SET display_name = $2, updated_at = NOW()
     WHERE phone = $1 AND (display_name IS NULL OR TRIM(display_name) = '')`,
    [phone, trimmed]
  );
}

export async function updateUserLanguage(
  phone: string,
  language: Language
): Promise<void> {
  await query(
    "UPDATE users SET language = $2, updated_at = NOW() WHERE phone = $1",
    [phone, language]
  );
}

export async function updateUserRole(
  phone: string,
  role: UserRole
): Promise<void> {
  await query(
    "UPDATE users SET role = $2, updated_at = NOW() WHERE phone = $1",
    [phone, role]
  );
}
