-- Add preferences column to User table (JSON serialized as NVARCHAR(MAX))
-- Stores per-user UI preferences like { theme: 'dark' | 'light' }
ALTER TABLE [User] ADD [preferences] NVARCHAR(MAX) NULL;
