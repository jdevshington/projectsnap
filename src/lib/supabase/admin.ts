// src/lib/supabase/admin.ts
//
// Supabase client using the SERVICE ROLE key. Bypasses RLS by design.
// ONLY for server-side code paths that need to write without a user session
// — the PayPal webhook handler, create-subscription, and refund routes,
// where the caller is PayPal (or acting on PayPal's behalf), not a request
// carrying a normal user session.
//
// This is the only place in the app that imports the service role key. If
// you find yourself reaching for this in a Server Component or Server
// Action that already has a user, you almost certainly want `createClient`
// from "./server" instead.

import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set.");
  }
  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. This must never be exposed to the client."
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
