BEGIN TRY

BEGIN TRAN;

-- AlterTable: increase Form.schema and FormSubmission.data capacity for large JSON payloads
ALTER TABLE [dbo].[Form] ALTER COLUMN [title] NVARCHAR(255);
ALTER TABLE [dbo].[Form] ALTER COLUMN [schema] NVARCHAR(MAX);
ALTER TABLE [dbo].[FormSubmission] ALTER COLUMN [data] NVARCHAR(MAX);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
