-- supabase/migrations/20260725_capture_get_user_id_by_email.sql
--
-- Capture the existing public.get_user_id_by_email(p_email text) RPC.
--
-- Until this migration, this function only lived in the Supabase project
-- itself — it was created by hand in the SQL Editor and never versioned
-- in the repo. That meant a fresh Supabase project (or a
-- disaster-recovery rebuild) would silently lose the email-lookup
-- fallback that src/app/api/paypal/webhook/route.ts relies on when a
-- PayPal webhook arrives for a subscription we don't yet have a
-- user_id for.
--
-- This migration makes the definition reproducible. The body is a
-- case-insensitive lookup against auth.users, returning the first
-- matching id (or NULL if no match). The function is SECURITY DEFINER
-- so it can read auth.users regardless of the caller's role, and
-- search_path is locked to {public, auth} for safety.

create or replace function public.get_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;

revoke all on function public.get_user_id_by_email(text) from public;
grant execute on function public.get_user_id_by_email(text) to service_role;
