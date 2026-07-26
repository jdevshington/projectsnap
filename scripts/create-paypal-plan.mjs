// scripts/create-paypal-plan.mjs
//
// One-off script — NOT part of the app. Run once to create the sandbox
// product + subscription plan, get the Plan ID, then delete this file
// (or leave it, it's harmless, just never run it against PAYPAL_ENV=live
// by accident — it would create a real product/plan on your live account).
//
// Usage:
//   node --env-file=.env scripts/create-paypal-plan.mjs
//
// Requires PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_ENV in your .env.
// Uses Node's built-in fetch (Node 18+) — no dependencies needed.

const BASE =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

async function getAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET not found in env. Did you run with --env-file=.env ?"
    );
  }

  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`Token request failed: ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  return json.access_token;
}

async function createProduct(token) {
  const res = await fetch(`${BASE}/v1/catalogs/products`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": `projectsnap-product-${Date.now()}`,
    },
    body: JSON.stringify({
      name: "ProjectSnap",
      description: "Apartment work session tracker",
      type: "SERVICE",
      category: "SOFTWARE",
    }),
  });

  if (!res.ok) {
    throw new Error(`Create product failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

async function createPlan(token, productId) {
  const res = await fetch(`${BASE}/v1/billing/plans`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": `projectsnap-plan-${Date.now()}`,
    },
    body: JSON.stringify({
      product_id: productId,
      name: "ProjectSnap Monthly",
      description: "$15/month, billed from day one",
      billing_cycles: [
        {
          frequency: { interval_unit: "MONTH", interval_count: 1 },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0, // 0 = infinite, renews until canceled
          pricing_scheme: {
            fixed_price: { value: "15", currency_code: "USD" },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee_failure_action: "CONTINUE",
        payment_failure_threshold: 3,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Create plan failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

async function main() {
  console.log(
    `Using PayPal env: ${process.env.PAYPAL_ENV ?? "sandbox (default)"}`
  );
  console.log(`Base URL: ${BASE}`);

  console.log("\n1. Getting access token...");
  const token = await getAccessToken();
  console.log("   OK.");

  console.log("\n2. Creating product...");
  const product = await createProduct(token);
  console.log(`   Product created: ${product.id}`);

  console.log("\n3. Creating plan ($15/mo, no trial)...");
  const plan = await createPlan(token, product.id);
  console.log(`   Plan created: ${plan.id}`);

  console.log("\n✅ Done. Add this to your .env:");
  console.log(`\nPAYPAL_PLAN_ID_MONTHLY=${plan.id}\n`);
}

main().catch((err) => {
  console.error("\n❌ Failed:", err.message);
  process.exit(1);
});
