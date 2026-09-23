-- Migration: v0.29 / V0.29__add_article_type.sql
-- Description: Add articletype column to tbl_article (0 = Merchandise, 1 = Service)
-- Multi-tenant: Loops over all tenant schemas and public schema
-- Safe default: 0 ensures existing articles are unaffected and default to Merchandise

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name LIKE 'tenant_%' OR schema_name = 'public'
    ) LOOP
        EXECUTE format('
            ALTER TABLE %I.tbl_article 
            ADD COLUMN IF NOT EXISTS articletype INTEGER NOT NULL DEFAULT 0;
        ', r.schema_name);
    END LOOP;
END $$;
