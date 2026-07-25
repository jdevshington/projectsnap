-- 20260722_trial_reuse_prevention.sql
--
-- Adds profiles.trial_used_at to prevent a user from getting a second
-- 7-day trial by canceling and re-subscribing. The webhook stamps this
-- column on the first successful trial activation; subsequent activations
-- resolve to "active" instead of "trialing" and skip the write.
--
-- NOTE (v1 scope): cross-account abuse — a user creating a new account
-- with a different email to get a fresh trial — is intentionally NOT
-- prevented here. Out of scope for v1.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_used_at timestamptz null;
