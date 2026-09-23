import { z } from "zod";

export const adminSessionBodySchema = z.object({
  apiKey: z.string().min(1).optional(),
});

export const adminUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  /** "all" or omit = no role filter (admin UI default) */
  role: z.enum(["landlord", "tenant", "all"]).optional(),
  verified: z.enum(["true", "false"]).optional(),
  suspended: z.enum(["true", "false"]).optional(),
});

export const adminHousesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  status: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  rentMin: z.coerce.number().int().nonnegative().optional(),
  rentMax: z.coerce.number().int().nonnegative().optional(),
  category: z.string().optional(),
});

export const houseStatusBodySchema = z.object({
  status: z.enum(["active", "inactive", "flagged", "under_review"]),
});

export const suspendUserBodySchema = z.object({
  suspended: z.boolean(),
  reason: z.string().max(500).optional(),
});

export const unlockFeeBodySchema = z.object({
  unlockFeeRwf: z.number().int().min(1000),
});

export const disputeBodySchema = z.object({
  reason: z.string().max(1000).optional(),
  flagRefund: z.boolean().optional(),
});

export const rejectIdBodySchema = z.object({
  reason: z.string().max(500).optional(),
});

export const replacePhotosBodySchema = z.object({
  imageUrls: z.array(z.string().min(1).max(2000)).min(1).max(20),
});

export const testWhatsAppBodySchema = z.object({
  phone: z.string().min(8).max(20),
});

export const publicListingsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(48).default(24).optional(),
  cursor: z.string().max(200).optional(),
});

export const publicMediaQuerySchema = z.object({
  ref: z.string().min(1).max(500),
  kind: z.enum(["image", "video"]).default("image").optional(),
});

export const ussdBodySchema = z.object({
  sessionId: z.string().min(1),
  phoneNumber: z.string().min(6),
  text: z.string().optional().default(""),
});

export const simulateWebhookBodySchema = z
  .object({
    phone: z.string().min(6).optional(),
    text: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    imageId: z.string().optional(),
  })
  .refine((d) => Boolean(d.phone), { message: "phone is required" });

export const searchQuerySchema = z.object({
  q: z.string().max(200).optional().default(""),
});

export const auditLogQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100).optional(),
});

export const paymentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  tenant: z.string().optional(),
  house: z.string().optional(),
  disputed: z.enum(["true", "false"]).optional(),
});
