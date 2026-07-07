-- Add preferences column to User table (JSON serialized as NVARCHAR(MAX))
-- Stores per-user UI preferences like { theme: 'dark' | 'light' }
-- Idempotent: guarded with IF NOT EXISTS so this migration is safe to run on
-- databases where the column was already added by `prisma db push`.
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'User' AND COLUMN_NAME = 'preferences'
)
BEGIN
  ALTER TABLE [User] ADD [preferences] NVARCHAR(MAX) NULL;
END
