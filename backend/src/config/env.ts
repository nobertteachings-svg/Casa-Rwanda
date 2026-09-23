import { z } from "zod";
import dotenv from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });
dotenv.config();

/** Trim Railway/UI whitespace; treat blank as unset. */
function cleanEnv(key: string): string | undefined {
  const raw = process.env[key];
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

// Normalize WhatsApp vars before Zod (empty / whitespace-only → unset)
for (const key of [
  "WHATSAPP_TOKEN",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_APP_SECRET",
  "WHATSAPP_BUSINESS_ACCOUNT_ID",
  "WHATSAPP_VERIFY_TOKEN",
] as const) {
  const cleaned = cleanEnv(key);
  if (cleaned === undefined) delete process.env[key];
  else process.env[key] = cleaned;
}

console.info("[env] whatsapp keys", {
  token_length: cleanEnv("WHATSAPP_TOKEN")?.length ?? 0,
  phone_number_id_length: cleanEnv("WHATSAPP_PHONE_NUMBER_ID")?.length ?? 0,
  app_secret_length: cleanEnv("WHATSAPP_APP_SECRET")?.length ?? 0,
  verify_token_length: cleanEnv("WHATSAPP_VERIFY_TOKEN")?.length ?? 0,
  business_account_id_length: cleanEnv("WHATSAPP_BUSINESS_ACCOUNT_ID")?.length ?? 0,
});

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z
    .string()
    .default("development")
    .transform((v) => v.trim().toLowerCase())
    .pipe(z.enum(["development", "production", "test"])),
  DATABASE_URL: z.string().min(1),
  DATABASE_POOL_URL: z.string().optional(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  WHATSAPP_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().default("casa_verify_token"),
  WHATSAPP_APP_SECRET: z.string().optional(),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  PAYSTACK_SECRET_KEY: z.string().optional(),
  FLUTTERWAVE_SECRET_KEY: z.string().optional(),
  PAYMENTS_ENABLED: z
    .string()
    .optional()
    .default("false")
    .transform((v) => v === "true" || v === "1"),
  UNLOCK_FEE_RWF: z.coerce.number().default(2000),
  DEFAULT_SEARCH_RADIUS_KM: z.coerce.number().default(5),
  DAILY_UNLOCK_LIMIT: z.coerce.number().default(10),
  ALLOW_WEBHOOK_SIMULATE: z
    .string()
    .optional()
    .default("false")
    .transform((v) => v === "true" || v === "1"),
  ADMIN_API_KEY: z.string().optional(),
  ADMIN_ORIGIN: z.string().default("http://localhost:5173"),
  MARKETING_ORIGIN: z.string().default("http://localhost:5174"),
  /** Public backend URL for absolute media links */
  PUBLIC_API_URL: z.string().optional(),
  /** Public E.164 digits for Casa WhatsApp (wa.me links). */
  PUBLIC_WHATSAPP_PHONE: z.string().optional().default("250735496786"),
  APP_JWT_SECRET: z.string().optional(),
  APP_OTP_TTL_SEC: z.coerce.number().default(600),
  WHATSAPP_OTP_TEMPLATE_NAME: z.string().optional().default("casa_login_code"),
  WHATSAPP_OTP_TEMPLATE_LANG_EN: z.string().default("en"),
  WHATSAPP_OTP_TEMPLATE_LANG_FR: z.string().default("fr"),
  APP_REVIEW_PHONE: z.string().optional(),
  APP_REVIEW_OTP: z.string().optional(),
  APP_REVIEW_PHONE_2: z.string().optional(),
  APP_REVIEW_OTP_2: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  PROCESS_ROLE: z.enum(["all", "web", "worker"]).default("all"),
});

export const env = envSchema.parse(process.env);

export const isWhatsAppConfigured = Boolean(
  env.WHATSAPP_TOKEN?.trim() && env.WHATSAPP_PHONE_NUMBER_ID?.trim()
);

export const isClaudeConfigured = Boolean(env.ANTHROPIC_API_KEY);

export const isPaymentsEnabled = env.PAYMENTS_ENABLED;

export function casaWhatsAppLink(prefill?: string): string {
  const digits = env.PUBLIC_WHATSAPP_PHONE.replace(/\D/g, "") || "250735496786";
  const text = prefill?.trim() ? `?text=${encodeURIComponent(prefill)}` : "";
  return `https://wa.me/${digits}${text}`;
}
