-- Canonical Directory district names are the phonelist sheet's own names
-- (wk_DistrictsTable). Rows imported from the 2024 PDF used different labels
-- (Chinese 1-3, Katy, Spanish); rename them in place. Idempotent UPDATEs —
-- a no-op on databases without those rows.
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'DirectoryMember')
BEGIN
  UPDATE [DirectoryMember] SET [district] = 'C - Sugar Land'   WHERE [district] = 'Chinese 1';
  UPDATE [DirectoryMember] SET [district] = 'C - Diho'         WHERE [district] = 'Chinese 2';
  UPDATE [DirectoryMember] SET [district] = 'C - Medical Ctr'  WHERE [district] = 'Chinese 3';
  UPDATE [DirectoryMember] SET [district] = 'S - Spanish Lang' WHERE [district] = 'Spanish';
  UPDATE [DirectoryMember] SET [district] = 'West'             WHERE [district] = 'Katy';
END
