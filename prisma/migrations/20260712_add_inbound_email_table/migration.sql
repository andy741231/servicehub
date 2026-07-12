-- Add InboundEmail table for the inbound email processing feature.
-- Stores emails received via Google Apps Script → /api/email/inbound webhook.
-- Idempotent: guarded with IF NOT EXISTS so this migration is safe to run on
-- databases where the table was already added by `prisma db push`.
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_NAME = 'InboundEmail'
)
BEGIN
  CREATE TABLE [InboundEmail] (
    [id] NVARCHAR(36) NOT NULL,
    [messageId] NVARCHAR(255) NULL,
    [fromEmail] NVARCHAR(255) NOT NULL,
    [fromName] NVARCHAR(255) NULL,
    [toEmail] NVARCHAR(255) NOT NULL,
    [subject] NVARCHAR(255) NOT NULL,
    [bodyText] NVARCHAR(MAX) NULL,
    [bodyHtml] NVARCHAR(MAX) NULL,
    [labels] NVARCHAR(255) NULL,
    [receivedAt] DATETIME2 NOT NULL DEFAULT (SYSUTCDATETIME()),
    [createdAt] DATETIME2 NOT NULL DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_InboundEmail] PRIMARY KEY ([id])
  );
END;

-- Index on receivedAt (most recent emails first)
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'InboundEmail_receivedAt_index' AND object_id = OBJECT_ID('InboundEmail')
)
BEGIN
  CREATE INDEX [InboundEmail_receivedAt_index] ON [InboundEmail] ([receivedAt]);
END;

-- Index on fromEmail (lookup by sender)
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = 'InboundEmail_fromEmail_index' AND object_id = OBJECT_ID('InboundEmail')
)
BEGIN
  CREATE INDEX [InboundEmail_fromEmail_index] ON [InboundEmail] ([fromEmail]);
END;
