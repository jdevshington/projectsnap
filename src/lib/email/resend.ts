// src/lib/email/resend.ts
//
// Thin wrapper around the Resend client for the four billing
// notifications we send today. Centralized so:
//   1. The webhook handler doesn't need to know HTML/CSS.
//   2. Every send goes through the same swallower — a Resend error
//      must NEVER break the billing flow. The webhook always returns
//      200 to PayPal; a missing receipt email is preferable to a 500
//      that triggers a 3-day retry storm.
//   3. Subject lines and styling are consistent across the product.

import "server-only";
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL ?? "info@gkreations.cloud";

// Lazy singleton — Resend's constructor is cheap, but we avoid
// constructing it (and any future auth work) on module import so
// build-time imports don't trip on missing env vars in environments
// where email is intentionally not configured.
let _client: Resend | null = null;
function getClient(): Resend | null {
  if (!apiKey) {
    console.error("[email] RESEND_API_KEY is not set; skipping send");
    return null;
  }
  if (!_client) _client = new Resend(apiKey);
  return _client;
}

// Brand palette mirrors the app: #111110 background, #F5F5F5 text,
// #E8FF57 lime accent for the wordmark.
const STYLES = {
  bg: "#111110",
  text: "#F5F5F5",
  accent: "#E8FF57",
  muted: "#8A8A86",
} as const;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(d: Date): string {
  // Match the app's locale-aware formatting for date-only values.
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function layout(body: string): string {
  // Single-column minimal shell — no images, no external assets, no
  // marketing links. Wordmark on top, content, "ProjectSnap" footer.
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:${STYLES.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${STYLES.text};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${STYLES.bg};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
            <tr>
              <td style="padding:8px 0 24px 0;font-size:20px;font-weight:600;letter-spacing:-0.01em;">
                <span style="color:${STYLES.accent};">Project</span><span style="color:${STYLES.text};">Snap</span>
              </td>
            </tr>
            <tr>
              <td style="padding:0 0 24px 0;font-size:15px;line-height:1.6;color:${STYLES.text};">
                ${body}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 0 0 0;font-size:12px;color:${STYLES.muted};border-top:1px solid #2A2A28;">
                ProjectSnap
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function send(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const client = getClient();
  if (!client) return;
  try {
    const { error } = await client.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
    });
    if (error) {
      console.error("[email] Resend returned error", { to, subject, error });
    }
  } catch (err) {
    console.error("[email] Resend threw", err, { to, subject });
  }
}

export async function sendTrialStarted(
  to: string,
  trialEndDate: Date
): Promise<void> {
  const safeTo = escapeHtml(to);
  const date = formatDate(trialEndDate);
  await send(
    to,
    "Your ProjectSnap trial has started",
    layout(`
      <p style="margin:0 0 16px 0;">Hi ${safeTo},</p>
      <p style="margin:0 0 16px 0;">Your 7-day trial of ProjectSnap is now active. You have full access until <strong style="color:${STYLES.accent};">${date}</strong> — no charges will be made before then.</p>
      <p style="margin:0;">If you don't cancel before the trial ends, your subscription will begin and your payment method on file will be charged.</p>
    `)
  );
}

export async function sendPaymentSucceeded(
  to: string,
  amount: string,
  nextBillingDate: Date
): Promise<void> {
  const safeTo = escapeHtml(to);
  const safeAmount = escapeHtml(amount);
  const date = formatDate(nextBillingDate);
  await send(
    to,
    "Payment confirmed — ProjectSnap",
    layout(`
      <p style="margin:0 0 16px 0;">Hi ${safeTo},</p>
      <p style="margin:0 0 16px 0;">We received your payment of <strong style="color:${STYLES.accent};">${safeAmount}</strong>. Your ProjectSnap subscription is active.</p>
      <p style="margin:0;">Your next billing date is <strong>${date}</strong>. You can manage your subscription anytime from your account settings.</p>
    `)
  );
}

export async function sendPaymentFailed(
  to: string,
  retryDate: Date | null
): Promise<void> {
  const safeTo = escapeHtml(to);
  const retryLine = retryDate
    ? `We'll automatically retry the payment on <strong>${formatDate(retryDate)}</strong>.`
    : `Please update your payment method to keep your subscription active.`;
  await send(
    to,
    "Payment failed — ProjectSnap",
    layout(`
      <p style="margin:0 0 16px 0;">Hi ${safeTo},</p>
      <p style="margin:0 0 16px 0;">We weren't able to process your latest payment for ProjectSnap.</p>
      <p style="margin:0 0 16px 0;">${retryLine}</p>
      <p style="margin:0;">If we can't collect payment, your access will be paused until the issue is resolved.</p>
    `)
  );
}

export async function sendSubscriptionCanceled(
  to: string,
  accessUntil: Date
): Promise<void> {
  const safeTo = escapeHtml(to);
  const date = formatDate(accessUntil);
  await send(
    to,
    "Your ProjectSnap subscription has been canceled",
    layout(`
      <p style="margin:0 0 16px 0;">Hi ${safeTo},</p>
      <p style="margin:0 0 16px 0;">Your ProjectSnap subscription has been canceled. You'll keep full access until <strong style="color:${STYLES.accent};">${date}</strong>, after which your account will switch to the free tier.</p>
      <p style="margin:0;">You can re-subscribe anytime from the billing page — your data and projects will be right where you left them.</p>
    `)
  );
}
