import pg from "pg";
import { env } from "../config/env.js";

function databaseUrl(): string {
  return env.DATABASE_POOL_URL ?? env.DATABASE_URL;
}

function needsPgSsl(url: string): boolean {
  // Railway private network (*.railway.internal) is plain TCP — do not force SSL.
  if (url.includes("railway.internal") || url.includes("localhost") || url.includes("127.0.0.1")) {
    return false;
  }
  if (url.includes("sslmode=disable")) return false;
  return (
    url.includes("supabase") ||
    url.includes("railway.app") ||
    url.includes("sslmode=require") ||
    url.includes("sslmode=verify")
  );
}

export const pool = new pg.Pool({
  connectionString: databaseUrl(),
  ssl: needsPgSsl(databaseUrl()) ? { rejectUnauthorized: false } : undefined,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  statement_timeout: 15_000,
});

export async function query<T extends pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}
