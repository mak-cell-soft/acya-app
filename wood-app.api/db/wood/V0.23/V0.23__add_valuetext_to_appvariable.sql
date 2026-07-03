START TRANSACTION;

ALTER TABLE tbl_appvariable ADD COLUMN IF NOT EXISTS valuetext TEXT NULL;

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260703095000_AddValueTextToAppVariable', '7.0.20');

COMMIT;
