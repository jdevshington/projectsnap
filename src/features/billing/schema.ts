// src/features/billing/schema.ts

import { z } from "zod";

/** Plan enum. Matches the CHECK constraint on subscriptions.plan. v1 is
 *  monthly-only but kept as an enum so adding yearly later is a value
 *  change, not a schema rewrite. */
export const planSchema = z.enum(["monthly", "yearly"]);
export type Plan = z.infer<typeof planSchema>;

/** No input needed — reads the current user from getUser(). Kept for
 *  symmetry with the other actions in this project. */
export const getBillingOverviewSchema = z.object({}).strict();

/** cancelSubscription: no body. We infer which subscription from the
 *  authenticated user — never a client-supplied id. */
export const cancelSubscriptionSchema = z.object({}).strict();
