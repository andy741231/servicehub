-- Directory P1 schema: SMS subsystem + Google sync columns
-- (directory-migration.md §5). Idempotent: every statement is guarded so this
-- is safe on databases where `prisma db push` already applied the same
-- changes. Do NOT add to `migrate resolve` — it must actually run.

-- ── DirectoryAccount.email → nullable, filtered unique ─────────────────────
-- SMS-link sign-in (P4) covers members with no email, so the column becomes
-- optional. The old NOT NULL unique constraint can't coexist with NULLs, so
-- it drops first; a filtered unique index re-enforces uniqueness on
-- non-null values (same pattern as DirectoryMember.userId/spouseMemberId).
IF EXISTS (
  SELECT 1 FROM sys.key_constraints
  WHERE name = 'DirectoryAccount_email_key'
    AND parent_object_id = OBJECT_ID('DirectoryAccount')
)
  ALTER TABLE [DirectoryAccount] DROP CONSTRAINT [DirectoryAccount_email_key];

-- Standalone-index form (covers DBs where the unique was an index, not a
-- constraint); only drop it when it is still unfiltered.
IF EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'DirectoryAccount_email_key'
    AND object_id = OBJECT_ID('DirectoryAccount')
    AND is_unique = 1 AND has_filter = 0
)
  DROP INDEX [DirectoryAccount_email_key] ON [DirectoryAccount];

IF EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'DirectoryAccount' AND COLUMN_NAME = 'email' AND IS_NULLABLE = 'NO'
)
  ALTER TABLE [DirectoryAccount] ALTER COLUMN [email] NVARCHAR(1000) NULL;

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'DirectoryAccount_email_key' AND object_id = OBJECT_ID('DirectoryAccount')
)
  CREATE UNIQUE INDEX [DirectoryAccount_email_key]
    ON [DirectoryAccount] ([email]) WHERE [email] IS NOT NULL;

-- ── DirectoryMember: phone-list lineage + Google Contacts sync columns ─────
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'DirectoryMember')
BEGIN
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'DirectoryMember' AND COLUMN_NAME = 'legacyId')
    ALTER TABLE [DirectoryMember] ADD [legacyId] NVARCHAR(1000) NULL;
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'DirectoryMember' AND COLUMN_NAME = 'googleContactId')
    ALTER TABLE [DirectoryMember] ADD [googleContactId] NVARCHAR(1000) NULL;
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'DirectoryMember' AND COLUMN_NAME = 'googleSyncHash')
    ALTER TABLE [DirectoryMember] ADD [googleSyncHash] NVARCHAR(1000) NULL;
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'DirectoryMember' AND COLUMN_NAME = 'googleSyncedAt')
    ALTER TABLE [DirectoryMember] ADD [googleSyncedAt] DATETIME2 NULL;
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'DirectoryMember' AND COLUMN_NAME = 'googleSyncError')
    ALTER TABLE [DirectoryMember] ADD [googleSyncError] NVARCHAR(1000) NULL;

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'DirectoryMember_phone1_idx' AND object_id = OBJECT_ID('DirectoryMember'))
    CREATE NONCLUSTERED INDEX [DirectoryMember_phone1_idx] ON [DirectoryMember] ([phone1]);

  -- phonelist CognitoID (e.g. "827.1"): unique when present, but many rows
  -- arrive without one — filtered unique, same pattern as userId.
  -- EXEC(): legacyId may be created moments earlier in THIS batch — plain
  -- CREATE INDEX would compile against pre-ALTER metadata and fail with
  -- "Invalid column name 'legacyId'" (happened on first prod run).
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'DirectoryMember_legacyId_key' AND object_id = OBJECT_ID('DirectoryMember'))
    EXEC('CREATE UNIQUE INDEX [DirectoryMember_legacyId_key] ON [DirectoryMember] ([legacyId]) WHERE [legacyId] IS NOT NULL');
END;

-- ── DirectorySmsPhone: per-NUMBER SMS state ────────────────────────────────
-- STOP/welcome/pending state lives on the phone number, not the member, so
-- shared phones behave correctly.
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'DirectorySmsPhone')
BEGIN
  CREATE TABLE [DirectorySmsPhone] (
    [phone] NVARCHAR(32) NOT NULL,
    [optedOutAt] DATETIME2 NULL,
    [welcomedAt] DATETIME2 NULL,
    [pendingCommand] NVARCHAR(MAX) NULL,
    [pendingExpiresAt] DATETIME2 NULL,
    [lastInboundAt] DATETIME2 NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DirectorySmsPhone_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [DirectorySmsPhone_pkey] PRIMARY KEY ([phone])
  );
END;

-- ── DirectorySmsLog: private SMS activity log (admin-only, retention-purged)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'DirectorySmsLog')
BEGIN
  CREATE TABLE [DirectorySmsLog] (
    [id] NVARCHAR(1000) NOT NULL,
    [direction] NVARCHAR(1000) NOT NULL,
    [phone] NVARCHAR(1000) NOT NULL,
    [memberId] NVARCHAR(1000) NULL,
    [command] NVARCHAR(1000) NULL,
    [body] NVARCHAR(MAX) NOT NULL,
    [providerMessageId] NVARCHAR(1000) NULL,
    [status] NVARCHAR(1000) NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DirectorySmsLog_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [DirectorySmsLog_pkey] PRIMARY KEY ([id])
  );
  CREATE NONCLUSTERED INDEX [DirectorySmsLog_createdAt_idx] ON [DirectorySmsLog] ([createdAt]);
  CREATE NONCLUSTERED INDEX [DirectorySmsLog_phone_idx] ON [DirectorySmsLog] ([phone]);
END;

-- ── DirectorySetting: typed, admin-editable settings ───────────────────────
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'DirectorySetting')
BEGIN
  CREATE TABLE [DirectorySetting] (
    [key] NVARCHAR(200) NOT NULL,
    [value] NVARCHAR(MAX) NOT NULL,
    [updatedAt] DATETIME2 NOT NULL,
    [updatedByName] NVARCHAR(1000) NULL,
    CONSTRAINT [DirectorySetting_pkey] PRIMARY KEY ([key])
  );
END;

-- ── DirectoryJobRun: job lease, one run per (job, periodKey) ───────────────
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'DirectoryJobRun')
BEGIN
  CREATE TABLE [DirectoryJobRun] (
    [id] NVARCHAR(1000) NOT NULL,
    [job] NVARCHAR(100) NOT NULL,
    [periodKey] NVARCHAR(100) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [summary] NVARCHAR(MAX) NULL,
    [startedAt] DATETIME2 NOT NULL CONSTRAINT [DirectoryJobRun_startedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [finishedAt] DATETIME2 NULL,
    CONSTRAINT [DirectoryJobRun_pkey] PRIMARY KEY ([id]),
    CONSTRAINT [DirectoryJobRun_job_periodKey_key] UNIQUE ([job], [periodKey])
  );
END;
