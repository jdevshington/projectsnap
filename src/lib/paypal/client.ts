// src/lib/paypal/client.ts
//
// Thin hand-rolled wrapper around PayPal's REST API. All functions here are
// SERVER-ONLY — never import from a client component.

const SANDBOX_BASE = "https://api-m.sandbox.paypal.com";
const LIVE_BASE = "https://api-m.paypal.com";

function baseUrl(): string {
  const env = process.env.PAYPAL_ENV;
  if (env === "live") return LIVE_BASE;
  // Default to sandbox if unset — a misconfigured deploy should fail in a
  // sandbox-ish way, not accidentally bill real cards.
  return SANDBOX_BASE;
}

interface TokenCacheEntry {
  token: string;
  expiresAt: number; // epoch ms
}

let cachedToken: TokenCacheEntry | null = null;

/** Fetches (and caches) a PayPal OAuth access token. */
export async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.token;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET are not set. Check your env vars."
    );
  }

  const res = await fetch(`${baseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization:
        "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `PayPal token request failed: ${res.status} ${res.statusText} — ${text}`
    );
  }

  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
    token_type: string;
  };

  cachedToken = { token: json.access_token, expiresAt: now + json.expires_in * 1000 };
  return json.access_token;
}

/** Issue an authenticated request to PayPal. Throws on non-2xx. */
export async function paypalFetch<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(init.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new PayPalApiError(res.status, res.statusText, text, path);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export class PayPalApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: string,
    public readonly path: string
  ) {
    super(`PayPal ${status} ${statusText} on ${path}: ${body}`);
  }
}
