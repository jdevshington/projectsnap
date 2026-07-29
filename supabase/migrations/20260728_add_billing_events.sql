-- supabase/migrations/20260728_add_billing_events.sql
--
-- User-facing billing history, shown on /profile. One row per
-- notable billing event (payment succeeded/failed, trial started,
-- subscription canceled, refund issued) — written at the exact same
-- point in the code where the corresponding email is sent (webhook
-- route.ts and refund/route.ts), so this table and the emails a user
-- received can never drift apart.
--
-- Deliberately does NOT store card details — PayPal does not expose
-- the buyer's card to the merchant for PayPal-wallet payments, which
-- is the only payment method this app supports today. "amount"/
-- "currency" are nullable because not every event type has a monetary
-- amount (e.g. trial_started).

create table if not exists public.billing_events (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  event_type   text        not null
                            check (event_type in (
                              'trial_started',
                              'payment_succeeded',
                              'payment_failed',
                              'subscription_canceled',
                              'refund_issued'
                            )),
  amount       numeric,
  currency     text,
  occurred_at  timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create index if not exists billing_events_user_id_occurred_at_idx
  on public.billing_events (user_id, occurred_at desc);

alter table public.billing_events enable row level security;

-- Users can read their own billing history — same pattern as
-- subscriptions: SELECT only, no insert/update/delete for
-- authenticated. Only service_role (webhook + refund route) writes.
drop policy if exists "users can read own billing events" on public.billing_events;
create policy "users can read own billing events"
  on public.billing_events
  for select
  to authenticated
  using (user_id = auth.uid());
