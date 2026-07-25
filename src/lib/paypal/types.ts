// src/lib/paypal/types.ts
//
// TypeScript types for the PayPal events we actually consume. Only the fields
// we read are typed — PayPal's full event payloads are large and we don't want
// the maintenance cost of mirroring them.

export type PayPalSubscriptionStatus =
  | "APPROVAL_PENDING"
  | "APPROVED"
  | "ACTIVE"
  | "SUSPENDED"
  | "CANCELLED"
  | "EXPIRED"
  | "CREATED";

export type InternalStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "expired"
  | "incomplete";

export type PayPalEventType =
  | "BILLING.SUBSCRIPTION.CREATED"
  | "BILLING.SUBSCRIPTION.ACTIVATED"
  | "BILLING.SUBSCRIPTION.RENEWED"
  | "BILLING.SUBSCRIPTION.UPDATED"
  | "BILLING.SUBSCRIPTION.SUSPENDED"
  | "BILLING.SUBSCRIPTION.CANCELLED"
  | "BILLING.SUBSCRIPTION.EXPIRED"
  | "BILLING.SUBSCRIPTION.PAYMENT.FAILED"
  | "PAYMENT.SALE.COMPLETED"
  | "PAYMENT.SALE.REFUNDED"
  | "PAYMENT.SALE.DENIED"
  | "CHECKOUT.ORDER.APPROVED"
  | "CHECKOUT.ORDER.COMPLETED";

export interface PayPalSubscriptionResource {
  id: string;
  status: PayPalSubscriptionStatus;
  plan_id?: string;
  start_time?: string;
  status_change_time?: string;
  subscriber?: {
    email_address?: string;
    payer_id?: string;
  };
  billing_info?: {
    next_billing_time?: string;
    last_payment?: {
      time?: string;
      amount?: { value: string; currency_code: string };
    };
    cycle_executions?: Array<{
      tenure_type: "REGULAR" | "TRIAL";
      sequence: number;
      cycles_completed: number;
      cycles_remaining: number;
      current_pricing_scheme_version?: number;
    }>;
  };
}

export interface PayPalSubscriptionEvent {
  event_type:
    | "BILLING.SUBSCRIPTION.CREATED"
    | "BILLING.SUBSCRIPTION.ACTIVATED"
    | "BILLING.SUBSCRIPTION.RENEWED"
    | "BILLING.SUBSCRIPTION.UPDATED"
    | "BILLING.SUBSCRIPTION.SUSPENDED"
    | "BILLING.SUBSCRIPTION.CANCELLED"
    | "BILLING.SUBSCRIPTION.EXPIRED"
    | "BILLING.SUBSCRIPTION.PAYMENT.FAILED";
  resource: PayPalSubscriptionResource;
}

export interface PayPalSaleEvent {
  event_type: "PAYMENT.SALE.COMPLETED" | "PAYMENT.SALE.REFUNDED" | "PAYMENT.SALE.DENIED";
  resource: {
    id: string;
    billing_agreement_id?: string;
    state: "completed" | "refunded" | "partially_refunded" | "denied" | "pending" | "failed";
    amount?: { total: string; currency: string };
    create_time?: string;
    update_time?: string;
  };
}

export interface PayPalOrderEvent {
  event_type: "CHECKOUT.ORDER.APPROVED" | "CHECKOUT.ORDER.COMPLETED";
  resource: {
    id: string;
    status: string;
    purchase_units?: Array<{ reference_id?: string; custom_id?: string }>;
    payer?: { payer_id?: string; email_address?: string };
  };
}

export type PayPalEvent = PayPalSubscriptionEvent | PayPalSaleEvent | PayPalOrderEvent;

/** Map a PayPal subscription status to our internal enum. Anything we don't
 *  recognize becomes "incomplete" so we never accidentally grant access.
 *
 *  Note: PayPal sometimes reports "ACTIVE" for a subscription that's still
 *  inside its free-trial cycle (rather than a distinct trial status). The
 *  webhook handler checks billing_info.cycle_executions separately and
 *  overrides to "trialing" when the first cycle is TRIAL — see
 *  app/api/paypal/webhook/route.ts. That override currently only fires when
 *  this function's output is "trialing" or "incomplete"; it does NOT catch
 *  the ACTIVE-during-trial case. Access is unaffected either way (active and
 *  trialing both grant access), but the /profile UI may show "Active"
 *  instead of "Free trial" during the trial window. Low-priority display bug,
 *  not a security issue — worth fixing in a follow-up round. */
export function mapPayPalStatusToInternal(
  s: PayPalSubscriptionStatus
): InternalStatus {
  switch (s) {
    case "ACTIVE":
      return "active";
    case "APPROVAL_PENDING":
    case "APPROVED":
      return "incomplete";
    case "SUSPENDED":
      return "past_due";
    case "CANCELLED":
      return "canceled";
    case "EXPIRED":
      return "expired";
    case "CREATED":
      return "trialing";
  }
}
