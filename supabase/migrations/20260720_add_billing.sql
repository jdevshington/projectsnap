-- supabase/migrations/20260720_add_billing.sql
--
-- Billing foundation: profiles.is_exempt + subscriptions table + RLS + helper
-- function. Apply by hand in Supabase SQL Editor (no migration runner in this
-- repo — see docs/projectsnap-changelog-2026-07-18.md §7.2 for the convention).
--
-- Design notes:
--   * profiles.is_exempt is a permanent admin-granted bypass (e.g. for the
--     author's girlfriend, family, testers). It is independent of PayPal —
--     an exempt user never appears in the subscription lifecycle.
--   * subscriptions is one row per user. UNIQUE on user_id enforces that.
--     paypal_subscription_id is also UNIQUE so webhook re-deliveries are
--     idempotent.
--   * RLS: authenticated users can SELECT their own row. NO insert/update/
--     delete policies for authenticated — only the service_role key (used by
--     the PayPal webhook route handler) can write. This is the whole point:
--     a user cannot tamper with their own subscription state from the client.
--   * has_paid_access() is the single source of truth for access checks.
--     is_exempt short-circuits before we touch subscriptions.

------------------------------------------------------------------------
-- 1. profiles.is_exempt
------------------------------------------------------------------------

alter table public.profiles
  add column if not exists is_exempt boolean not null default false;

------------------------------------------------------------------------
-- 2. subscriptions table
------------------------------------------------------------------------

create table if not exists public.subscriptions (
  user_id                 uuid        primary key references public.profiles(id) on delete cascade,
  status                  text        not null
                                      check (status in ('trialing','active','past_due','canceled','expired','incomplete')),
  plan                    text        not null
                                      check (plan in ('monthly','yearly')),
  paypal_subscription_id  text        unique,
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  cancel_at               timestamptz,
  canceled_at             timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists subscriptions_status_idx
  on public.subscriptions (status);

create index if not exists subscriptions_current_period_end_idx
  on public.subscriptions (current_period_end);

-- Auto-bump updated_at on row change. Matches the pattern other tables in
-- this project use (trigger-based, not app-level).
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists subscriptions_touch_updated_at on public.subscriptions;
create trigger subscriptions_touch_updated_at
  before update on public.subscriptions
  for each row execute function public.touch_updated_at();

------------------------------------------------------------------------
-- 3. RLS on subscriptions
------------------------------------------------------------------------

alter table public.subscriptions enable row level security;

-- Users can read their own row. This is safe — it only exposes the user's
-- own subscription state, which they could already infer from the UI.
drop policy if exists "users can read own subscription" on public.subscriptions;
create policy "users can read own subscription"
  on public.subscriptions
  for select
  to authenticated
  using (user_id = auth.uid());

-- No insert/update/delete policies for the authenticated role.
-- Only the service_role key (held by the webhook route handler) can write.

------------------------------------------------------------------------
-- 4. has_paid_access(uid) — single source of truth
------------------------------------------------------------------------

create or replace function public.has_paid_access(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- Exempt users are always paid, full stop.
  select coalesce(
    (select is_exempt from public.profiles where id = uid),
    false
  )
  or
  -- Otherwise: status is active or trialing AND the current period hasn't ended.
  exists (
    select 1
    from public.subscriptions s
    where s.user_id = uid
      and s.status in ('active', 'trialing')
      and s.current_period_end is not null
      and s.current_period_end > now()
  );
$$;

-- Lock down the function: only authenticated users may call it, and only
-- with their own uid. The service_role bypasses this anyway, so it's belt-
-- and-suspenders, not a hard wall.
revoke all on function public.has_paid_access(uuid) from public;
grant execute on function public.has_paid_access(uuid) to authenticated;

------------------------------------------------------------------------
-- 5. billing_incidents — unresolved webhook events
------------------------------------------------------------------------

-- When a webhook arrives for a subscription we can't resolve to a user
-- (e.g. placeholder row from create-subscription never landed AND the
-- email lookup in auth.users fails), we record the event here instead
-- of silently dropping it. service_role writes, the admin reads them
-- from the Supabase dashboard to reconcile manually.
--
-- NOT readable by the authenticated role. No UI in v1; admin-only.

create table if not exists public.billing_incidents (
  id                     uuid        primary key default gen_random_uuid(),
  paypal_subscription_id text,
  event_type             text        not null,
  raw_payload            jsonb       not null,
  user_id                uuid        references public.profiles(id) on delete set null,
  reason                 text        not null, -- e.g. 'cannot_resolve_user'
  created_at             timestamptz not null default now()
);

create index if not exists billing_incidents_subscription_id_idx
  on public.billing_incidents (paypal_subscription_id);

create index if not exists billing_incidents_created_at_idx
  on public.billing_incidents (created_at desc);

alter table public.billing_incidents enable row level security;

-- No policies for `authenticated` — only service_role can read/write.
-- This is intentional: these are admin-debug records, not user-visible.
