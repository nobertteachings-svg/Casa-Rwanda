import type { Request, Response, NextFunction } from "express";
import { ZodError, type ZodSchema } from "zod";

type RequestPart = "body" | "query" | "params";

function formatZodError(err: ZodError): string {
  return err.issues.map((i) => `${i.path.join(".") || "value"}: ${i.message}`).join("; ");
}

/**
 * Validate and replace a request part with Zod-parsed output.
 * Supports correctness + security by rejecting malformed input early.
 */
export function validate(schema: ZodSchema, part: RequestPart = "body") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req[part]);
    if (!parsed.success) {
      const details = formatZodError(parsed.error);
      res.status(400).json({
        error: details.includes("phone") ? "phone is required" : "Invalid request",
        details,
      });
      return;
    }
    // Express query/params are getters — assign via mutable cast where needed
    (req as Request & Record<RequestPart, unknown>)[part] = parsed.data;
    next();
  };
}

/**
 * USSD gateways expect plain-text END responses, not JSON.
 */
export function validateUssd(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).type("text/plain").send("END Missing sessionId or phoneNumber\n");
      return;
    }
    req.body = parsed.data;
    next();
  };
}
