-- Web Builder JSON columns were plain `String` in schema.prisma, which Prisma
-- maps to NVARCHAR(1000) on SQL Server. Block content over ~1,000 characters
-- (a Text block with a few paragraphs, a long Features list, slide captions)
-- could not be saved: the editor's save failed with a 500. Same limit on the
-- page header/footer JSON and the site style tokens / draft templates.
-- Widening to NVARCHAR(MAX) keeps every existing value; re-running is harmless.
ALTER TABLE [dbo].[WebBlock] ALTER COLUMN [content] NVARCHAR(MAX) NOT NULL;
ALTER TABLE [dbo].[WebPage] ALTER COLUMN [header] NVARCHAR(MAX) NULL;
ALTER TABLE [dbo].[WebPage] ALTER COLUMN [footer] NVARCHAR(MAX) NULL;
ALTER TABLE [dbo].[WebSiteStyle] ALTER COLUMN [tokens] NVARCHAR(MAX) NOT NULL;
ALTER TABLE [dbo].[WebSiteStyle] ALTER COLUMN [draftTemplates] NVARCHAR(MAX) NULL;
