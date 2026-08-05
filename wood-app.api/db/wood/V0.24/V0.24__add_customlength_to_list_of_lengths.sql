-- Migration to add customlengthcm and totalwidthcm to tbl_list_of_lengths across all tenant schemas and public schema
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%' OR schema_name = 'public') LOOP
        EXECUTE format('ALTER TABLE %I.tbl_list_of_lengths ADD COLUMN IF NOT EXISTS customlengthcm double precision;', r.schema_name);
        EXECUTE format('ALTER TABLE %I.tbl_list_of_lengths ADD COLUMN IF NOT EXISTS totalwidthcm double precision;', r.schema_name);
    END LOOP;
END $$;
