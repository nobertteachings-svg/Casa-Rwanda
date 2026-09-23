import Anthropic from "@anthropic-ai/sdk";
import { env, isClaudeConfigured, isWhatsAppConfigured } from "../../config/env.js";
import { query } from "../../db/pool.js";
import { downloadWhatsAppMedia } from "./voice.js";
import { prepareIdImageForVision } from "./media.js";

/** Haiku is much faster for structured ID reads; Sonnet stays for chat/listings. */
const ID_SCAN_MODEL = "claude-haiku-4-5";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}

export interface IdScanResult {
  is_valid_id: boolean;
  document_type: string;
  is_rwanda_document: boolean;
  full_name: string | null;
  id_number: string | null;
  expiry_date: string | null;
  is_expired: boolean;
  confidence: "high" | "medium" | "low";
  rejection_reason: string | null;
  /** front | back | both — which side(s) this analysis covered */
  side?: "front" | "back" | "both" | "unknown";
}

export interface PreparedIdImage {
  base64: string;
  mediaType: "image/jpeg";
}

export interface LandlordIdVerificationOutcome {
  status: "approved" | "rejected" | "manual_review";
  message: string;
  scan: IdScanResult | null;
}

function extractionPrompt(sideHint: string): string {
  return `You extract a person's name from a document photo for Casa (Rwanda housing landlord verification).

${sideHint}

Accept ANY document that clearly shows a person's full name — Rwandan National ID, passport, driver's license, REG bill, Mobile Money statement, receipt, invoice, bank slip, or similar.
Your PRIMARY job is to read the person's full name.
Also extract ID/document number and expiry date when present (optional — null is fine if absent).
Do NOT reject because it is a receipt or not a government ID.
Do NOT judge photo quality harshly if the name is readable.
If text is partially readable, still extract what you can.

Return ONLY valid JSON:
{
  "is_valid_id": boolean,
  "document_type": "national_id" | "passport" | "drivers_license" | "receipt" | "other" | "not_an_id",
  "is_rwanda_document": boolean,
  "full_name": string or null,
  "id_number": string or null,
  "expiry_date": "YYYY-MM-DD" or null,
  "is_expired": boolean,
  "confidence": "high" | "medium" | "low",
  "rejection_reason": string or null
}

Rules:
- Prefer extracting full_name over rejecting
- full_name = the person's name as printed on the document (null only if truly unreadable)
- id_number = optional document/reference number (null if absent/unreadable)
- expiry_date = optional; null if not present
- is_expired = true if expiry_date is before today (${new Date().toISOString().slice(0, 10)}); still return the date
- is_valid_id = true if the image shows a document with a readable personal name (including receipts/bills)
- document_type = "national_id" for Rwandan National ID / ID card; "receipt" for receipts/invoices/bills; "not_an_id" ONLY if there is clearly no personal name and it is not a document
- is_rwanda_document = true when the document appears Rwandan (National ID, REG, Mobile Money, Rwandan passport, etc.)
- rejection_reason = null unless no personal name can be found at all`;
}

function parseScanResponse(response: Anthropic.Message): IdScanResult | null {
  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") return null;

  try {
    const json = block.text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(json) as IdScanResult;
  } catch {
    return null;
  }
}

/** Analyze a single ID side (front or back). */
export async function analyzeIdImage(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp",
  side: "front" | "back" | "unknown" = "unknown"
): Promise<IdScanResult | null> {
  if (!isClaudeConfigured) return null;

  const response = await getClient().messages.create({
    model: ID_SCAN_MODEL,
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: imageBase64 },
          },
          {
            type: "text",
            text: extractionPrompt(
              side === "unknown"
                ? "This is one side of an identity document."
                : `This image is the *${side}* of the identity document.`
            ),
          },
        ],
      },
    ],
  });

  const scan = parseScanResponse(response);
  if (!scan) return null;
  return { ...scan, side };
}

/** Analyze front + back together and merge fields in one pass. */
export async function analyzeIdImages(
  images: PreparedIdImage[],
  labels: Array<"front" | "back" | "unknown"> = []
): Promise<IdScanResult | null> {
  if (!isClaudeConfigured) return null;
  if (images.length === 0) return null;
  if (images.length === 1) {
    return analyzeIdImage(images[0].base64, images[0].mediaType, labels[0] ?? "unknown");
  }

  const content: Anthropic.Messages.ContentBlockParam[] = [];
  images.forEach((img, i) => {
    const label = labels[i] ?? (i === 0 ? "front" : "back");
    content.push({
      type: "image",
      source: { type: "base64", media_type: img.mediaType, data: img.base64 },
    });
    content.push({
      type: "text",
      text: `Image ${i + 1} = ${label} of the document.`,
    });
  });
  content.push({
    type: "text",
    text: extractionPrompt(
      "You are given the front and back of the same ID. Combine fields from both sides into one result (prefer clearer readings)."
    ),
  });

  const response = await getClient().messages.create({
    model: ID_SCAN_MODEL,
    max_tokens: 512,
    messages: [{ role: "user", content }],
  });

  const scan = parseScanResponse(response);
  if (!scan) return null;
  return { ...scan, side: "both" };
}

export function mergeIdScans(...scans: Array<IdScanResult | null | undefined>): IdScanResult | null {
  const parts = scans.filter((s): s is IdScanResult => Boolean(s));
  if (parts.length === 0) return null;

  const pick = <K extends keyof IdScanResult>(key: K): IdScanResult[K] | null => {
    for (const p of parts) {
      const v = p[key];
      if (typeof v === "string" && v.trim()) return v.trim() as IdScanResult[K];
      if (v !== null && v !== undefined && typeof v !== "string") return v;
    }
    return null;
  };

  const full_name = (pick("full_name") as string | null) ?? null;
  const id_number = (pick("id_number") as string | null) ?? null;
  const expiry_date = (pick("expiry_date") as string | null) ?? null;
  const document_type =
    parts.find((p) => p.document_type && p.document_type !== "not_an_id")?.document_type ??
    parts[0].document_type;

  const confidenceOrder = { high: 3, medium: 2, low: 1 } as const;
  const confidence = parts.reduce<"high" | "medium" | "low">(
    (best, p) => (confidenceOrder[p.confidence] > confidenceOrder[best] ? p.confidence : best),
    "low"
  );

  return {
    is_valid_id: parts.some((p) => p.is_valid_id) || Boolean(full_name),
    document_type,
    is_rwanda_document: parts.some((p) => p.is_rwanda_document),
    full_name,
    id_number,
    expiry_date,
    is_expired: parts.some((p) => p.is_expired && p.expiry_date === expiry_date)
      ? true
      : expiry_date
        ? expiry_date < new Date().toISOString().slice(0, 10)
        : false,
    confidence,
    rejection_reason: null,
    side: parts.length > 1 ? "both" : parts[0].side ?? "unknown",
  };
}

/** Any single document with a readable name is enough — no second side required. */
export function canFinalizeFromFrontOnly(scan: IdScanResult): boolean {
  return Boolean(scan.full_name?.trim());
}

export function decideOutcome(scan: IdScanResult, lang: "en" | "fr"): LandlordIdVerificationOutcome {
  const name = scan.full_name?.trim() || null;

  if (!name) {
    return {
      status: "rejected",
      message:
        lang === "fr"
          ? "❌ Nom illisible.\n\nRenvoyez *une photo* d'un document où votre *nom* est clairement visible (National ID, passeport, reçu, facture, etc.)."
          : "❌ Could not read the name.\n\nPlease resend *one photo* of a document where your *name* is clearly visible (National ID, passport, receipt, bill, etc.).",
      scan,
    };
  }

  const idLine = scan.id_number
    ? lang === "fr"
      ? `N° pièce: *${scan.id_number}*\n`
      : `ID #: *${scan.id_number}*\n`
    : "";
  const expiryLine = scan.expiry_date
    ? lang === "fr"
      ? `Expiration: *${scan.expiry_date}*\n`
      : `Expires: *${scan.expiry_date}*\n`
    : "";

  return {
    status: "approved",
    message:
      lang === "fr"
        ? `✅ Identité vérifiée !\n\nNom: *${name}*\n${idLine}${expiryLine}Vous pouvez maintenant publier des annonces avec le badge *Propriétaire vérifié*.`
        : `✅ Identity verified!\n\nName: *${name}*\n${idLine}${expiryLine}You can now list properties with the *Verified landlord* badge.`,
    scan,
  };
}

async function saveVerificationRecord(
  landlordPhone: string,
  mediaRefFront: string,
  mediaRefBack: string | null,
  scan: IdScanResult | null,
  status: string,
  rejectionReason?: string
): Promise<void> {
  await query(
    `INSERT INTO landlord_id_verifications (
      landlord_phone, media_reference, media_reference_back, document_type, full_name, id_number,
      expiry_date, status, rejection_reason, claude_analysis
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      landlordPhone,
      mediaRefFront,
      mediaRefBack,
      scan?.document_type ?? null,
      scan?.full_name ?? null,
      scan?.id_number ?? null,
      scan?.expiry_date ?? null,
      status,
      rejectionReason ?? scan?.rejection_reason ?? null,
      scan ? JSON.stringify(scan) : null,
    ]
  );
}

export async function applyApproval(landlordPhone: string, scan: IdScanResult): Promise<void> {
  // Bind name/id as text in every use — mixing TRIM() (text) with varchar raises 42P08.
  const fullName = scan.full_name?.trim() || null;
  const idNumber = scan.id_number?.trim() || null;
  await query(
    `UPDATE users SET
      verified = TRUE,
      verified_at = NOW(),
      verification_method = 'landlord_id',
      id_full_name = LEFT($2::text, 120),
      id_expiry_date = $3::date,
      id_number = LEFT($4::text, 60),
      display_name = COALESCE(NULLIF(TRIM(display_name), ''), LEFT($2::text, 100)),
      updated_at = NOW()
    WHERE phone = $1`,
    [landlordPhone, fullName, scan.expiry_date, idNumber]
  );
}

export async function analyzePreparedSide(
  imageBuffer: Buffer,
  side: "front" | "back"
): Promise<IdScanResult | null> {
  const prepared = await prepareIdImageForVision(imageBuffer);
  return analyzeIdImage(prepared.base64, prepared.mediaType, side);
}

export async function finalizeLandlordIdVerification(
  landlordPhone: string,
  frontMediaId: string,
  backMediaId: string | null,
  scan: IdScanResult,
  lang: "en" | "fr"
): Promise<LandlordIdVerificationOutcome> {
  const outcome = decideOutcome(scan, lang);
  await saveVerificationRecord(
    landlordPhone,
    `wa-media:${frontMediaId}`,
    backMediaId ? `wa-media:${backMediaId}` : null,
    scan,
    outcome.status,
    outcome.status === "rejected" ? outcome.message : undefined
  );

  if (outcome.status === "approved") {
    await applyApproval(landlordPhone, scan);
  }

  return outcome;
}

/** Legacy single-photo path — used by admin re-scan of one image. */
export async function scanAndVerifyLandlordId(
  landlordPhone: string,
  mediaId: string,
  lang: "en" | "fr",
  prefetchedImage?: Buffer | null
): Promise<LandlordIdVerificationOutcome> {
  if (!isClaudeConfigured) {
    return {
      status: "manual_review",
      message:
        lang === "fr"
          ? "⏳ Document reçu. Vérification manuelle (IA non configurée)."
          : "⏳ Document received. Manual review (AI not configured).",
      scan: null,
    };
  }

  let imageBuffer: Buffer | null = prefetchedImage ?? null;

  if (!imageBuffer && isWhatsAppConfigured) {
    imageBuffer = await downloadWhatsAppMedia(mediaId);
  }

  if (!imageBuffer) {
    await saveVerificationRecord(landlordPhone, `wa-media:${mediaId}`, null, null, "manual_review");
    return {
      status: "manual_review",
      message:
        lang === "fr"
          ? "⏳ Document enregistré. Vérification en cours."
          : "⏳ Document recorded. Verification in progress.",
      scan: null,
    };
  }

  const scan = await analyzePreparedSide(imageBuffer, "front");

  if (!scan) {
    await saveVerificationRecord(landlordPhone, `wa-media:${mediaId}`, null, null, "manual_review");
    return {
      status: "manual_review",
      message:
        lang === "fr"
          ? "⏳ Impossible d'analyser le document. Vérification manuelle en cours."
          : "⏳ Could not analyze document. Manual review in progress.",
      scan: null,
    };
  }

  return finalizeLandlordIdVerification(landlordPhone, mediaId, null, scan, lang);
}

export async function batchLandlordVerified(phones: string[]): Promise<Map<string, boolean>> {
  const unique = [...new Set(phones.filter(Boolean))];
  const map = new Map<string, boolean>();
  if (unique.length === 0) return map;
  const result = await query<{ phone: string; verified: boolean }>(
    `SELECT phone, verified FROM users
     WHERE phone = ANY($1::text[]) AND role = 'landlord' AND verification_method = 'landlord_id'`,
    [unique]
  );
  for (const phone of unique) map.set(phone, false);
  for (const row of result.rows) map.set(row.phone, row.verified === true);
  return map;
}

export async function isLandlordVerified(phone: string): Promise<boolean> {
  const result = await query<{ verified: boolean; verification_method: string | null }>(
    `SELECT verified, verification_method FROM users WHERE phone = $1 AND role = 'landlord'`,
    [phone]
  );
  const row = result.rows[0];
  return row?.verified === true && row?.verification_method === "landlord_id";
}

export function landlordVerifiedBadge(lang: "en" | "fr", verified: boolean): string {
  if (!verified) return "";
  return lang === "fr" ? " ✅ Propriétaire vérifié" : " ✅ Verified landlord";
}

export async function listPendingIdVerifications(): Promise<
  Array<{
    id: string;
    landlord_phone: string;
    media_reference: string;
    media_reference_back: string | null;
    full_name: string | null;
    document_type: string | null;
    id_number: string | null;
    expiry_date: string | null;
    status: string;
    rejection_reason: string | null;
    claude_analysis: IdScanResult | null;
    created_at: Date;
    listing_count: number;
  }>
> {
  const result = await query<{
    id: string;
    landlord_phone: string;
    media_reference: string;
    media_reference_back: string | null;
    full_name: string | null;
    document_type: string | null;
    id_number: string | null;
    expiry_date: string | null;
    status: string;
    rejection_reason: string | null;
    claude_analysis: IdScanResult | null;
    created_at: Date;
    listing_count: number;
  }>(
    `SELECT v.id, v.landlord_phone, v.media_reference, v.media_reference_back, v.full_name, v.document_type,
            v.id_number, v.expiry_date, v.status, v.rejection_reason, v.claude_analysis, v.created_at,
            (SELECT COUNT(*)::int FROM houses h WHERE h.landlord_phone = v.landlord_phone) AS listing_count
     FROM landlord_id_verifications v
     WHERE v.status IN ('manual_review', 'pending')
     ORDER BY v.created_at DESC`
  );
  return result.rows;
}

export async function rejectIdVerification(
  verificationId: string,
  reason: string
): Promise<boolean> {
  const result = await query(
    `UPDATE landlord_id_verifications
     SET status = 'rejected', rejection_reason = $2
     WHERE id = $1 AND status IN ('manual_review', 'pending')`,
    [verificationId, reason]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function approveManualIdVerification(
  verificationId: string
): Promise<boolean> {
  const record = await query<{
    landlord_phone: string;
    full_name: string | null;
    id_number: string | null;
    expiry_date: string | null;
    claude_analysis: IdScanResult | null;
  }>(
    `SELECT landlord_phone, full_name, id_number, expiry_date, claude_analysis
     FROM landlord_id_verifications WHERE id = $1`,
    [verificationId]
  );
  const row = record.rows[0];
  if (!row) return false;

  await query(
    `UPDATE landlord_id_verifications SET status = 'approved' WHERE id = $1`,
    [verificationId]
  );

  const scan: IdScanResult = row.claude_analysis ?? {
    is_valid_id: true,
    document_type: "national_id",
    is_rwanda_document: true,
    full_name: row.full_name,
    id_number: row.id_number,
    expiry_date: row.expiry_date,
    is_expired: false,
    confidence: "high",
    rejection_reason: null,
  };

  await applyApproval(row.landlord_phone, scan);
  return true;
}
