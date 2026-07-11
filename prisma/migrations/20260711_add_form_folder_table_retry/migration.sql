-- Add FormFolder table for API-backed form folder organization
-- This is a retry of 20260711_add_form_folder_table which was incorrectly
-- marked as applied via `migrate resolve` without the SQL actually running.
-- Idempotent: guarded with IF NOT EXISTS so it's safe to run on any DB.
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
