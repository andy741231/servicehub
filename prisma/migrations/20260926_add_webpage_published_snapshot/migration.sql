-- Add `publishedSnapshot` column to WebPage — JSON snapshot of published
-- content (header, footer, sections+blocks). This field existed in
-- schema.prisma and was applied to dev DBs via `db push`, but no migration
-- file was created, so production never received the column and every
-- WebPage query 500'd (P2022 column does not exist).
-- Idempotent: skips the ALTER where db push already applied it (e.g. `stage`).
IF COL_LENGTH(N'[dbo].[WebPage]', N'publishedSnapshot') IS NULL
BEGIN
  ALTER TABLE [dbo].[WebPage] ADD [publishedSnapshot] NVARCHAR(MAX) NULL;
END
