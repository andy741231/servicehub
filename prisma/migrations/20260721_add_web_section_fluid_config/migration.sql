-- Add `fluidConfig` column to WebSection for Fluid Engine layout settings.
-- Stores JSON string: { gridColumns, gap:{horizontal,vertical}, fillScreen, minHeight, verticalAlignment }
-- Idempotent: safe to re-run on databases where the column already exists.
IF COL_LENGTH(N'[dbo].[WebSection]', N'fluidConfig') IS NULL
BEGIN
  ALTER TABLE [dbo].[WebSection] ADD [fluidConfig] NVARCHAR(MAX) NULL;
END
