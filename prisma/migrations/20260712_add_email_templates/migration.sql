BEGIN TRY

BEGIN TRAN;

IF OBJECT_ID(N'[dbo].[EmailTemplate]', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[EmailTemplate] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [subject] NVARCHAR(1000) NOT NULL CONSTRAINT [EmailTemplate_subject_df] DEFAULT N'',
    [document] NVARCHAR(max) NOT NULL,
    [bodyHtml] NVARCHAR(max) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [EmailTemplate_status_df] DEFAULT N'draft',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [EmailTemplate_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [EmailTemplate_pkey] PRIMARY KEY CLUSTERED ([id])
  );
END;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
  ROLLBACK TRAN;
END;
THROW

END CATCH
