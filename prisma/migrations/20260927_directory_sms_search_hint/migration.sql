-- SMS subsystem: per-number "how to search" hint flag (legacy srchSuggest).
-- The hint is appended to a lookup miss only once per phone number.
-- Idempotent — safe on databases where `prisma db push` already applied the
-- same change. Do NOT add to `migrate resolve` — it must actually run.

IF COL_LENGTH('DirectorySmsPhone', 'searchHintAt') IS NULL
  ALTER TABLE [DirectorySmsPhone] ADD [searchHintAt] DATETIME2 NULL;
