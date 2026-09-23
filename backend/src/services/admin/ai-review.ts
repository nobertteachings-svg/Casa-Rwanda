import Anthropic from "@anthropic-ai/sdk";
import { env, isClaudeConfigured } from "../../config/env.js";
import { query } from "../../db/pool.js";
import { findHouseById } from "../houses.js";
import { downloadWhatsAppMedia } from "../features/voice.js";
import { prepareIdImageForVision } from "../features/media.js";
import {
  analyzeIdImages,
  decideOutcome,
  applyApproval,
  type IdScanResult,
  type PreparedIdImage,
} from "../features/landlord-id-verification.js";
import { recordAiFailure } from "./ops.js";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}

export interface ListingAiReview {
  risk_level: "low" | "medium" | "high";
  recommendation: "approve" | "review" | "reject";
  summary: string;
  flags: string[];
  confidence: "high" | "medium" | "low";
}

export interface IdAiReviewResult {
  verificationId: string;
  status: "approved" | "rejected" | "manual_review";
  scan: IdScanResult | null;
  message: string;
}

async function loadMediaBase64(mediaRef: string): Promise<PreparedIdImage | null> {
  const match = mediaRef.match(/^wa-media:(.+)$/);
  if (!match) return null;
  const buffer = await downloadWhatsAppMedia(match[1]);
  if (!buffer) return null;
  return prepareIdImageForVision(buffer);
}

export async function runAiOnVerification(verificationId: string): Promise<IdAiReviewResult> {
  const row = await query<{
    landlord_phone: string;
    media_reference: string;
    media_reference_back: string | null;
    claude_analysis: IdScanResult | null;
  }>(
    `SELECT landlord_phone, media_reference, media_reference_back, claude_analysis
     FROM landlord_id_verifications WHERE id = $1`,
    [verificationId]
  );
  const record = row.rows[0];
  if (!record) {
    return { verificationId, status: "manual_review", scan: null, message: "Not found" };
  }

  if (!isClaudeConfigured) {
    return { verificationId, status: "manual_review", scan: record.claude_analysis, message: "AI not configured" };
  }

  const front = await loadMediaBase64(record.media_reference);
  const back = record.media_reference_back
    ? await loadMediaBase64(record.media_reference_back)
    : null;
  if (!front) {
    return { verificationId, status: "manual_review", scan: record.claude_analysis, message: "Could not load ID image" };
  }

  try {
    const images = back ? [front, back] : [front];
    const labels = back ? (["front", "back"] as const) : (["front"] as const);
    const scan = await analyzeIdImages([...images], [...labels]);
    if (!scan) {
      await recordAiFailure();
      return { verificationId, status: "manual_review", scan: null, message: "AI could not parse document" };
    }

    const outcome = decideOutcome(scan, "en");
    await query(
      `UPDATE landlord_id_verifications SET
        document_type = $2, full_name = $3, id_number = $4, expiry_date = $5,
        status = $6, rejection_reason = $7, claude_analysis = $8
       WHERE id = $1`,
      [
        verificationId,
        scan.document_type,
        scan.full_name,
        scan.id_number,
        scan.expiry_date,
        outcome.status,
        outcome.status === "rejected" ? scan.rejection_reason : null,
        JSON.stringify(scan),
      ]
    );

    if (outcome.status === "approved") {
      await applyApproval(record.landlord_phone, scan);
    }

    return { verificationId, status: outcome.status, scan, message: outcome.message };
  } catch {
    await recordAiFailure();
    return { verificationId, status: "manual_review", scan: null, message: "AI analysis failed" };
  }
}

export async function runAiOnAllPendingVerifications(): Promise<IdAiReviewResult[]> {
  const pending = await query<{ id: string }>(
    `SELECT id FROM landlord_id_verifications
     WHERE status IN ('manual_review', 'pending')
     ORDER BY created_at ASC
     LIMIT 20`
  );
  const results: IdAiReviewResult[] = [];
  for (const row of pending.rows) {
    results.push(await runAiOnVerification(row.id));
  }
  return results;
}

export async function reviewListingWithAi(houseId: string): Promise<ListingAiReview> {
  const house = await findHouseById(houseId);
  if (!house) {
    return {
      risk_level: "high",
      recommendation: "reject",
      summary: "Listing not found",
      flags: [],
      confidence: "high",
    };
  }

  if (!isClaudeConfigured) {
    return {
      risk_level: "medium",
      recommendation: "review",
      summary: "AI not configured — manual review required",
      flags: ["ai_unavailable"],
      confidence: "low",
    };
  }

  const imageParts: Anthropic.Messages.ContentBlockParam[] = [];
  for (const ref of (house.photos ?? []).slice(0, 3)) {
    const media = await loadMediaBase64(ref);
    if (media) {
      imageParts.push({
        type: "image",
        source: { type: "base64", media_type: media.mediaType, data: media.base64 },
      });
    }
  }

  const prompt = `You are a fraud analyst for Casa, a housing platform in Rwanda.

Review this listing for scam/fraud risk.

Listing data:
- ID: ${house.house_id}
- Category: ${house.property_category ?? "residential"} / ${house.property_subtype ?? house.type}
- Rent: ${house.rent} RWF/month
- Location: ${house.region ?? ""} ${house.town ?? ""} ${house.neighbourhood ?? ""} ${house.city ?? ""}
- GPS: ${house.latitude}, ${house.longitude}
- Electricity: ${house.electricity_meter ?? "unknown"}
- Landlord: ${house.landlord_phone}
- Trust tier: ${house.trust_tier ?? "standard"}
- Has video: ${(house.videos?.length ?? 0) > 0}

Return ONLY JSON:
{
  "risk_level": "low" | "medium" | "high",
  "recommendation": "approve" | "review" | "reject",
  "summary": "one sentence",
  "flags": ["array of specific concerns"],
  "confidence": "high" | "medium" | "low"
}

Flag duplicate-looking stock photos, unrealistic rent, missing video for premium claims, etc.`;

  try {
    const response = await getClient().messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: [...imageParts, { type: "text", text: prompt }],
        },
      ],
    });

    const block = response.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") throw new Error("no text");

    const json = block.text.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(json) as ListingAiReview;
  } catch {
    await recordAiFailure();
    return {
      risk_level: "medium",
      recommendation: "review",
      summary: "AI review failed — manual check needed",
      flags: ["ai_error"],
      confidence: "low",
    };
  }
}
