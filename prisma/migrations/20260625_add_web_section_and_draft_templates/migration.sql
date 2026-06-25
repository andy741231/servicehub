BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[WebBlock] DROP CONSTRAINT [WebBlock_pageId_fkey];

-- AlterTable: add sectionId to WebBlock
ALTER TABLE [dbo].[WebBlock] ADD [sectionId] NVARCHAR(1000);

-- AlterTable: add draftTemplates to WebSiteStyle
ALTER TABLE [dbo].[WebSiteStyle] ADD [draftTemplates] NVARCHAR(1000);

-- CreateTable
CREATE TABLE [dbo].[WebSection] (
    [id] NVARCHAR(1000) NOT NULL,
    [pageId] NVARCHAR(1000) NOT NULL,
    [order] INT NOT NULL,
    [columns] INT NOT NULL CONSTRAINT [WebSection_columns_df] DEFAULT 1,
    [gap] INT NOT NULL CONSTRAINT [WebSection_gap_df] DEFAULT 24,
    [paddingTop] INT NOT NULL CONSTRAINT [WebSection_paddingTop_df] DEFAULT 48,
    [paddingBottom] INT NOT NULL CONSTRAINT [WebSection_paddingBottom_df] DEFAULT 48,
    [paddingLeft] INT NOT NULL CONSTRAINT [WebSection_paddingLeft_df] DEFAULT 0,
    [paddingRight] INT NOT NULL CONSTRAINT [WebSection_paddingRight_df] DEFAULT 0,
    [marginTop] INT NOT NULL CONSTRAINT [WebSection_marginTop_df] DEFAULT 0,
    [marginBottom] INT NOT NULL CONSTRAINT [WebSection_marginBottom_df] DEFAULT 0,
    [backgroundColor] NVARCHAR(1000),
    CONSTRAINT [WebSection_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[WebSection] ADD CONSTRAINT [WebSection_pageId_fkey] FOREIGN KEY ([pageId]) REFERENCES [dbo].[WebPage]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[WebBlock] ADD CONSTRAINT [WebBlock_pageId_fkey] FOREIGN KEY ([pageId]) REFERENCES [dbo].[WebPage]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[WebBlock] ADD CONSTRAINT [WebBlock_sectionId_fkey] FOREIGN KEY ([sectionId]) REFERENCES [dbo].[WebSection]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
