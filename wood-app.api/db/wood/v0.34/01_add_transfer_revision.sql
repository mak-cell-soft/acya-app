-- Migration: v0.34 / 01_add_transfer_revision.sql
-- Description: Add revisionnumber, updatedate, and updatedbyid to tbl_stock_transfer.
-- Multi-tenant safe: iterates across all tenant schemas and public schema.

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name LIKE 'tenant_%' OR schema_name = 'public'
    ) LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = r.schema_name AND table_name = 'tbl_stock_transfer'
        ) THEN
            EXECUTE format('
                ALTER TABLE %I.tbl_stock_transfer 
                ADD COLUMN IF NOT EXISTS revisionnumber integer NOT NULL DEFAULT 1,
                ADD COLUMN IF NOT EXISTS updatedate timestamp without time zone NULL,
                ADD COLUMN IF NOT EXISTS updatedbyid integer NULL;
            ', r.schema_name);

            -- Add foreign key constraint if not exists
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE constraint_schema = r.schema_name 
                  AND table_name = 'tbl_stock_transfer'
                  AND constraint_name = 'FK_tbl_stock_transfer_tbl_app_user_updatedbyid'
            ) THEN
                EXECUTE format('
                    ALTER TABLE %I.tbl_stock_transfer
                    ADD CONSTRAINT "FK_tbl_stock_transfer_tbl_app_user_updatedbyid"
                    FOREIGN KEY (updatedbyid) REFERENCES %I.tbl_app_user (id) ON DELETE SET NULL;
                ', r.schema_name, r.schema_name);
            END IF;
        END IF;
    END LOOP;
END $$;
