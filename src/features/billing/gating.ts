// src/features/billing/gating.ts
//
// Server-side access gating. Call from the top of any Server Component
// page that requires paid access. Deliberately NOT done in (app)/layout.tsx
// — Next.js layouts don't have a clean way to read the current pathname
// server-side to exempt specific routes (/profile, /billing) without
// fragile header-sniffing. Calling this explicitly per-page also matches
// this project's existing pattern: every page already does its own
// getUser() + redirect("/login") check, so one more explicit line per
// page is consistent, not extra ceremony.
//
// Gated: dashboard, apartments (list/detail/new/edit), history.
// NOT gated: /profile, /billing, /billing/success, /billing/canceled.

import { redirect } from "next/navigation";
import { hasPaidAccess } from "./queries";

/** Redirects to /billing if the current user does not have paid access.
 *  Call after the page's own getUser()/redirect("/login") check — this
 *  assumes the user is already known to be authenticated. */
export async function requirePaidAccess(): Promise<void> {
  const paid = await hasPaidAccess();
  if (!paid) {
    redirect("/billing");
  }
}
