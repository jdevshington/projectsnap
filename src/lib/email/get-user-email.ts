// src/lib/email/get-user-email.ts
//
// Look up a user's email from their auth.users row. The webhook uses
// this to send notifications to the address the user actually signed
// up with — NEVER the email field on the PayPal payload (sandbox
// accounts and other test fixtures can pollute that field).
//
// This file is the single place that needs to know how to fetch an
// email. If we ever migrate to a different identity store, only this
// file changes.

import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error) {
      console.error("[email] getUserById error", error, { userId });
      return null;
    }
    const email = data?.user?.email;
    return email ?? null;
  } catch (err) {
    console.error("[email] getUserById threw", err, { userId });
    return null;
  }
}
