-- Add FormFolder table for API-backed form folder organization
-- Idempotent: guarded with IF NOT EXISTS so this migration is safe to run on
-- databases where the table was already added by `prisma db push`.
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_NAME = 'FormFolder'
)
BEGIN
  CREATE TABLE [FormFolder] (
    [id] NVARCHAR(36) NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [createdAt] DATETIME2 NOT NULL DEFAULT (SYSUTCDATETIME()),
    [updatedAt] DATETIME2 NOT NULL DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_FormFolder] PRIMARY KEY ([id])
  );
END
