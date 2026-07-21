// src/lib/paypal/verify-webhook.ts
//
// PayPal's webhook signature model uses an asymmetric signing cert. To
// verify a webhook, we POST the raw body + signature headers back to
// PayPal's /v1/notifications/verify-webhook-signature endpoint, and PayPal
// tells us whether the signature is valid for the Webhook ID we registered.
//
// This is the standard, low-risk path used by every official PayPal SDK
// sample (Python, PHP, Java, Node) — NOT a hand-rolled local verification.
// We deliberately do not reimplement CRC32/RSA verification ourselves for
// the mechanism that gates who gets charged and who gets access.

import { paypalFetch } from "./client";

export interface VerifyWebhookInput {
  /** The raw request body as a string. Must be byte-exact: do NOT
   *  request.json() and re-stringify — capture request.text() first. */
  rawBody: string;
  authAlgo: string;
  certUrl: string;
  transmissionId: string;
  transmissionSig: string;
  transmissionTime: string;
}

export interface VerifyWebhookResult {
  valid: boolean;
  /** PayPal returns 200 even on failure, with verification_status set to
   *  "FAILURE". We always read this field — never trust res.ok alone. */
  verificationStatus: "SUCCESS" | "FAILURE";
}

/** Verify a webhook's signature against PayPal via the postback API.
 *  Throws on transport error (treat as a 500 — PayPal will retry).
 *  Returns { valid: false } on a clean "this signature is bogus" or
 *  "this event body is malformed" response. */
export async function verifyWebhookSignature(
  input: VerifyWebhookInput
): Promise<VerifyWebhookResult> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    throw new Error(
      "PAYPAL_WEBHOOK_ID is not set. Register a webhook in the PayPal dashboard and add its ID to your env vars."
    );
  }

  // The postback endpoint requires webhook_event to be the JSON OBJECT of
  // the event, not the raw body string re-embedded verbatim. We parse it
  // here (the route handler already captured the raw bytes separately, so
  // nothing about the original body is lost before this point).
  let webhookEvent: unknown;
  try {
    webhookEvent = JSON.parse(input.rawBody);
  } catch {
    return { valid: false, verificationStatus: "FAILURE" };
  }

  const res = await paypalFetch<{ verification_status: "SUCCESS" | "FAILURE" }>(
    "/v1/notifications/verify-webhook-signature",
    {
      method: "POST",
      body: JSON.stringify({
        auth_algo: input.authAlgo,
        cert_url: input.certUrl,
        transmission_id: input.transmissionId,
        transmission_sig: input.transmissionSig,
        transmission_time: input.transmissionTime,
        webhook_id: webhookId,
        webhook_event: webhookEvent,
      }),
    }
  );

  return {
    valid: res.verification_status === "SUCCESS",
    verificationStatus: res.verification_status,
  };
}

/** Extract the verification headers PayPal sends. Returns null if any
 *  required header is missing. */
export function extractWebhookHeaders(
  headers: Headers
): Omit<VerifyWebhookInput, "rawBody"> | null {
  const authAlgo = headers.get("paypal-auth-algo");
  const certUrl = headers.get("paypal-cert-url");
  const transmissionId = headers.get("paypal-transmission-id");
  const transmissionSig = headers.get("paypal-transmission-sig");
  const transmissionTime = headers.get("paypal-transmission-time");

  if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
    return null;
  }

  return { authAlgo, certUrl, transmissionId, transmissionSig, transmissionTime };
}
