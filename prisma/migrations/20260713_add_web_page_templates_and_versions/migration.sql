-- Web Builder-specific reusable page templates and version history.
-- Idempotent for databases already synchronized through prisma db push.
IF OBJECT_ID(N'[dbo].[WebPageTemplate]', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[WebPageTemplate] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(1000) NULL,
    [snapshot] NVARCHAR(MAX) NOT NULL,
    [createdById] NVARCHAR(1000) NOT NULL,
    [createdByName] NVARCHAR(255) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [WebPageTemplate_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [WebPageTemplate_pkey] PRIMARY KEY CLUSTERED ([id])
  );
END;

IF OBJECT_ID(N'[dbo].[WebPageVersion]', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[WebPageVersion] (
    [id] NVARCHAR(1000) NOT NULL,
    [pageId] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(255) NOT NULL,
    [snapshot] NVARCHAR(MAX) NOT NULL,
    [savedById] NVARCHAR(1000) NOT NULL,
    [savedByName] NVARCHAR(255) NOT NULL,
    [versionNumber] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [WebPageVersion_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [WebPageVersion_pkey] PRIMARY KEY CLUSTERED ([id])
  );
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'WebPageVersion_pageId_fkey')
BEGIN
  ALTER TABLE [dbo].[WebPageVersion]
    ADD CONSTRAINT [WebPageVersion_pageId_fkey]
    FOREIGN KEY ([pageId]) REFERENCES [dbo].[WebPage]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;
END;
