-- Migration: v0.35 / 01_add_quotation_validity_and_commercial_conditions.sql
-- Description: Add validity_duration, validity_unit, and commercial_conditions to tbl_document for quotations and commercial terms.
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
            WHERE table_schema = r.schema_name AND table_name = 'tbl_document'
        ) THEN
            EXECUTE format('
                ALTER TABLE %I.tbl_document 
                ADD COLUMN IF NOT EXISTS validity_duration integer NULL,
                ADD COLUMN IF NOT EXISTS validity_unit character varying(50) NULL,
                ADD COLUMN IF NOT EXISTS commercial_conditions text NULL;
            ', r.schema_name);
        END IF;
    END LOOP;
END $$;
