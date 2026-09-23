import { Router } from "express";
import { handleUssdRequest } from "../services/features/ussd.js";
import { validateUssd } from "../middleware/validate.js";
import { ussdBodySchema } from "../schemas/http.js";
import { logger } from "../lib/logger.js";
import { captureError } from "../monitoring.js";

export const ussdRouter = Router();

/** USSD gateway endpoint — integrate with Africa's Talking or telco */
ussdRouter.post("/", validateUssd(ussdBodySchema), async (req, res) => {
  const { sessionId, phoneNumber, text } = req.body as {
    sessionId: string;
    phoneNumber: string;
    text: string;
  };

  try {
    const response = await handleUssdRequest({
      sessionId,
      phone: phoneNumber.replace(/\D/g, ""),
      text: text ?? "",
    });
    res.type("text/plain").send(response);
  } catch (err) {
    logger.error("USSD error", { err: String(err) });
    captureError(err, { component: "ussd" });
    res.type("text/plain").send("END Service unavailable.\n");
  }
});

ussdRouter.get("/", (_req, res) => {
  res.json({
    service: "Casa USSD",
    usage: "POST { sessionId, phoneNumber, text }",
    note: "Connect to telco USSD gateway for feature-phone access",
  });
});
