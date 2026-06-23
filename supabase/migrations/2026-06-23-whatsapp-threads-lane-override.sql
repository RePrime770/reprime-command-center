-- Lane override for comms threads.
--
-- Today a thread's lane (Investor vs Staff vs general 305/718) is derived:
--   - is_investor  : persistent boolean column (Pipedrive-driven)
--   - staff        : no representation yet
--
-- This adds a manual override so the user can MOVE a conversation between the
-- Investor and Staff lanes (both directions) from the cockpit. NULL = use the
-- derived/default lane; a value forces the lane regardless of derivation.
--
-- Apply via the Supabase SQL editor (Dashboard → SQL) or `supabase db push`.
-- It could not be auto-applied from the build machine because the documented
-- direct-connection DB passwords were rotated.

ALTER TABLE public.whatsapp_threads
  ADD COLUMN IF NOT EXISTS lane_override TEXT
  CHECK (lane_override IN ('investor', 'staff', 'general'));

CREATE INDEX IF NOT EXISTS whatsapp_threads_lane_override_idx
  ON public.whatsapp_threads (lane_override)
  WHERE lane_override IS NOT NULL;
