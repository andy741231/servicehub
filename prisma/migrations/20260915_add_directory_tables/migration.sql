-- Add DirectoryMember + DirectoryAuditLog tables for the Directory sub-app
-- (church phone list). Idempotent: guarded with IF NOT EXISTS so this migration
-- is safe to run on databases where the tables were already added by
-- `prisma db push`.
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_NAME = 'DirectoryMember'
)
BEGIN
  CREATE TABLE [DirectoryMember] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NULL,
    [email] NVARCHAR(1000) NULL,
    [firstName] NVARCHAR(1000) NOT NULL,
    [middleName] NVARCHAR(1000) NULL,
    [lastName] NVARCHAR(1000) NOT NULL,
    [otherName] NVARCHAR(1000) NULL,
    [gender] NVARCHAR(1000) NULL,
    [maritalStatus] NVARCHAR(1000) NULL,
    [dateOfBirth] DATETIME2 NULL,
    [photoUrl] NVARCHAR(1000) NULL,
    [isHeadOfHousehold] BIT NOT NULL CONSTRAINT [DirectoryMember_isHeadOfHousehold_df] DEFAULT 0,
    [spouseMemberId] NVARCHAR(1000) NULL,
    [spouseFirstName] NVARCHAR(1000) NULL,
    [spouseLastName] NVARCHAR(1000) NULL,
    [coupleId] NVARCHAR(1000) NULL,
    [role] NVARCHAR(1000) NOT NULL CONSTRAINT [DirectoryMember_role_df] DEFAULT 'saint',
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [DirectoryMember_status_df] DEFAULT 'pending',
    [district] NVARCHAR(1000) NOT NULL,
    [smallGroup] NVARCHAR(1000) NULL,
    [locality] NVARCHAR(1000) NOT NULL CONSTRAINT [DirectoryMember_locality_df] DEFAULT 'Houston',
    [optedIn] BIT NOT NULL CONSTRAINT [DirectoryMember_optedIn_df] DEFAULT 1,
    [addedAt] DATETIME2 NOT NULL CONSTRAINT [DirectoryMember_addedAt_df] DEFAULT (getdate()),
    [source] NVARCHAR(1000) NULL,
    [sourceAsOf] DATETIME2 NULL,
    [importBatchId] NVARCHAR(1000) NULL,
    [lastVerifiedAt] DATETIME2 NULL,
    [phone1] NVARCHAR(1000) NULL,
    [phone2] NVARCHAR(1000) NULL,
    [phonePrivacy] BIT NOT NULL CONSTRAINT [DirectoryMember_phonePrivacy_df] DEFAULT 1,
    [address] NVARCHAR(1000) NULL,
    [apartment] NVARCHAR(1000) NULL,
    [city] NVARCHAR(1000) NULL,
    [state] NVARCHAR(1000) NULL,
    [zip] NVARCHAR(1000) NULL,
    [addressPrivacy] BIT NOT NULL CONSTRAINT [DirectoryMember_addressPrivacy_df] DEFAULT 0,
    [changeType] NVARCHAR(1000) NULL,
    [changedAt] DATETIME2 NULL,
    [changedByName] NVARCHAR(1000) NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DirectoryMember_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [DirectoryMember_pkey] PRIMARY KEY ([id]),
    CONSTRAINT [DirectoryMember_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [User]([id]) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT [DirectoryMember_spouseMemberId_fkey] FOREIGN KEY ([spouseMemberId]) REFERENCES [DirectoryMember]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
  );

  CREATE INDEX [DirectoryMember_district_idx] ON [DirectoryMember] ([district]);
  CREATE INDEX [DirectoryMember_status_idx] ON [DirectoryMember] ([status]);
  CREATE INDEX [DirectoryMember_lastName_idx] ON [DirectoryMember] ([lastName]);

  -- Filtered unique indexes: uniqueness enforced only for non-null values so
  -- members without a linked login or spouse (the common case) don't collide.
  CREATE UNIQUE INDEX [DirectoryMember_userId_key] ON [DirectoryMember] ([userId]) WHERE [userId] IS NOT NULL;
  CREATE UNIQUE INDEX [DirectoryMember_spouseMemberId_key] ON [DirectoryMember] ([spouseMemberId]) WHERE [spouseMemberId] IS NOT NULL;
END;

-- Phone-list imports (e.g. the 2024 PDF) lack email/address/gender — these
-- contact fields are optional. ALTER is idempotent for DBs where the table
-- was created earlier with NOT NULL columns.
IF EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_NAME = 'DirectoryMember'
)
BEGIN
  ALTER TABLE [DirectoryMember] ALTER COLUMN [email] NVARCHAR(1000) NULL;
  ALTER TABLE [DirectoryMember] ALTER COLUMN [gender] NVARCHAR(1000) NULL;
  ALTER TABLE [DirectoryMember] ALTER COLUMN [maritalStatus] NVARCHAR(1000) NULL;
  ALTER TABLE [DirectoryMember] ALTER COLUMN [phone1] NVARCHAR(1000) NULL;
  ALTER TABLE [DirectoryMember] ALTER COLUMN [address] NVARCHAR(1000) NULL;
  ALTER TABLE [DirectoryMember] ALTER COLUMN [city] NVARCHAR(1000) NULL;
  ALTER TABLE [DirectoryMember] ALTER COLUMN [state] NVARCHAR(1000) NULL;
  ALTER TABLE [DirectoryMember] ALTER COLUMN [zip] NVARCHAR(1000) NULL;
END;

-- Import provenance + verification tracking (added after the initial table
-- shipped; guarded so this stays idempotent on both old and new schemas).
IF EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_NAME = 'DirectoryMember'
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'DirectoryMember' AND COLUMN_NAME = 'source')
    ALTER TABLE [DirectoryMember] ADD [source] NVARCHAR(1000) NULL;
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'DirectoryMember' AND COLUMN_NAME = 'sourceAsOf')
    ALTER TABLE [DirectoryMember] ADD [sourceAsOf] DATETIME2 NULL;
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'DirectoryMember' AND COLUMN_NAME = 'importBatchId')
    ALTER TABLE [DirectoryMember] ADD [importBatchId] NVARCHAR(1000) NULL;
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'DirectoryMember' AND COLUMN_NAME = 'lastVerifiedAt')
    ALTER TABLE [DirectoryMember] ADD [lastVerifiedAt] DATETIME2 NULL;
END;

-- Separate saint-facing sign-in accounts. Deliberately NOT linked to the Hub
-- User table: directory sessions can never escalate into Hub sessions.
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_NAME = 'DirectoryAccount'
)
BEGIN
  CREATE TABLE [DirectoryAccount] (
    [id] NVARCHAR(1000) NOT NULL,
    [memberId] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [passwordHash] NVARCHAR(1000) NULL,
    [sessionVersion] INT NOT NULL CONSTRAINT [DirectoryAccount_sessionVersion_df] DEFAULT 1,
    [passwordSetAt] DATETIME2 NULL,
    [lastLoginAt] DATETIME2 NULL,
    [disabledAt] DATETIME2 NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DirectoryAccount_createdAt_df] DEFAULT (getdate()),
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [DirectoryAccount_pkey] PRIMARY KEY ([id]),
    CONSTRAINT [DirectoryAccount_memberId_key] UNIQUE ([memberId]),
    CONSTRAINT [DirectoryAccount_email_key] UNIQUE ([email]),
    CONSTRAINT [DirectoryAccount_memberId_fkey] FOREIGN KEY ([memberId]) REFERENCES [DirectoryMember]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
  );
END;

IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_NAME = 'DirectoryAuditLog'
)
BEGIN
  CREATE TABLE [DirectoryAuditLog] (
    [id] NVARCHAR(1000) NOT NULL,
    [memberId] NVARCHAR(1000) NOT NULL,
    [actorId] NVARCHAR(1000) NOT NULL,
    [actorName] NVARCHAR(1000) NOT NULL,
    [changeType] NVARCHAR(1000) NOT NULL,
    [summary] NVARCHAR(MAX) NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DirectoryAuditLog_createdAt_df] DEFAULT (getdate()),
    CONSTRAINT [DirectoryAuditLog_pkey] PRIMARY KEY ([id]),
    CONSTRAINT [DirectoryAuditLog_memberId_fkey] FOREIGN KEY ([memberId]) REFERENCES [DirectoryMember]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION
  );

  CREATE INDEX [DirectoryAuditLog_memberId_idx] ON [DirectoryAuditLog] ([memberId]);
END;

-- One-time magic-link sign-in tokens for saints
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_NAME = 'DirectoryLoginToken'
)
BEGIN
  CREATE TABLE [DirectoryLoginToken] (
    [id] NVARCHAR(1000) NOT NULL,
    [memberId] NVARCHAR(1000) NOT NULL,
    [tokenHash] NVARCHAR(1000) NOT NULL,
    [expiresAt] DATETIME2 NOT NULL,
    [usedAt] DATETIME2 NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [DirectoryLoginToken_createdAt_df] DEFAULT (getdate()),
    CONSTRAINT [DirectoryLoginToken_pkey] PRIMARY KEY ([id]),
    CONSTRAINT [DirectoryLoginToken_tokenHash_key] UNIQUE ([tokenHash]),
    CONSTRAINT [DirectoryLoginToken_memberId_fkey] FOREIGN KEY ([memberId]) REFERENCES [DirectoryMember]([id]) ON DELETE CASCADE ON UPDATE CASCADE
  );

  CREATE INDEX [DirectoryLoginToken_memberId_idx] ON [DirectoryLoginToken] ([memberId]);
END;
