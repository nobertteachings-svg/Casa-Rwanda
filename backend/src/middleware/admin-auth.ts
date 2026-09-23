import type { Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";
import {
  adminFingerprintFromSecret,
  validateAdminSession,
} from "../services/admin/sessions.js";

declare module "express-serve-static-core" {
  interface Request {
    adminFingerprint?: string;
    adminSessionToken?: string;
  }
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function extractBearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  const xKey = req.headers["x-admin-key"];
  return typeof xKey === "string" ? xKey : undefined;
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!env.ADMIN_API_KEY) {
    res.status(503).json({ error: "Admin API not configured. Set ADMIN_API_KEY in .env" });
    return;
  }

  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const sessionFingerprint = await validateAdminSession(token);
  if (sessionFingerprint) {
    req.adminFingerprint = sessionFingerprint;
    req.adminSessionToken = token;
    next();
    return;
  }

  if (safeEqual(token, env.ADMIN_API_KEY)) {
    req.adminFingerprint = adminFingerprintFromSecret(token);
    next();
    return;
  }

  res.status(401).json({ error: "Unauthorized" });
}

export { safeEqual as safeAdminSecretEqual };
