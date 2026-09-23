import * as Sentry from "@sentry/node";
import { env } from "./config/env.js";

export function initMonitoring(): void {
  if (!env.SENTRY_DSN) return;

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === "production" ? 0.1 : 0,
  });
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (!env.SENTRY_DSN) {
    console.error(error, context);
    return;
  }
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

export { Sentry };
