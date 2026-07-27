-- ---------------------------------------------------------------------------
-- RLS: rate_limits
-- Fixed-window counters guarding the paid LLM endpoints (recipe paste/scan and
-- the translation cache). Run after migration 0009 (which creates the table).
--
-- Unlike every other table here, this one is NOT tenant-scoped by column — the
-- scope lives inside bucket_key ("scan:user:<id>", "translate:restaurant:<id>").
-- So instead of an isolation policy it gets the strictest possible treatment:
-- RLS enabled with ZERO policies, which denies anon and authenticated outright.
-- Only the server touches this table, via the postgres role (Drizzle), which
-- bypasses RLS as the table owner.
--
-- This matters more than it looks: the counters ARE the cost control. If a user
-- could reach this table through the Data API they could delete their own rows
-- and reset their quota at will, so no read or write is granted to the API roles.
-- ---------------------------------------------------------------------------
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Belt and braces alongside the empty policy set: take the privileges away too, so
-- the table is unreachable from PostgREST even if a policy is ever added by mistake.
-- Mirrors the hardening block at the end of setup.sql.
REVOKE ALL ON TABLE public.rate_limits FROM anon, authenticated;
