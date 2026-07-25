-- supabase/migrations/20260725_lock_has_paid_access.sql
--
-- Tighten public.has_paid_access(uid) so that the function only returns a
-- useful result when the caller is asking about THEMSELVES. The earlier
-- definition (20260720_add_billing.sql) lets an authenticated caller
-- probe the paid status of any uid by passing it in, which is an
-- information-disclosure bug: even though the only columns being
-- read are is_exempt and the user's own subscription status, the
-- function should never evaluate anyone except the calling user.
--
-- We add a `uid = auth.uid() and (...)` wrapper. For the service_role
-- (used by the PayPal webhook), auth.uid() returns NULL — and the
-- `uid = auth.uid()` check would therefore be NULL (false), so the
-- function would always return false. To preserve the existing
-- service_role call site (webhook + admin tooling), the body now
-- branches: if auth.uid() is NULL (i.e. service_role / anon), we
-- fall through to the original logic. This keeps behavior identical
-- for service_role while closing the disclosure for authenticated.

create or replace function public.has_paid_access(uid uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  is_self_call boolean;
  result boolean;
begin
  -- If the caller is a logged-in user, the argument MUST be their own
  -- auth.uid(). For service_role / anon, auth.uid() is NULL and the
  -- original permissive behavior is preserved.
  is_self_call := (auth.uid() is null) or (uid = auth.uid());

  if not is_self_call then
    return false;
  end if;

  -- Original logic, unchanged:
  --   * Exempt users are always paid, full stop.
  --   * Otherwise: status is active or trialing AND the current
  --     period hasn't ended.
  result :=
    coalesce(
      (select is_exempt from public.profiles where id = uid),
      false
    )
    or
    exists (
      select 1
      from public.subscriptions s
      where s.user_id = uid
        and s.status in ('active', 'trialing')
        and s.current_period_end is not null
        and s.current_period_end > now()
    );

  return result;
end;
$$;

-- Re-assert the grants from the original migration. Revoke/grant is
-- idempotent; this keeps the function callable from the same roles
-- after the redefinition.
revoke all on function public.has_paid_access(uuid) from public;
grant execute on function public.has_paid_access(uuid) to authenticated;
