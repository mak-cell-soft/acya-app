-- Migration: v0.42 / 02_add_ticket_status.sql
-- Description: Adds Status column to tbl_support_tickets across all tenant schemas and public schema.
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
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = r.schema_name AND table_name = 'tbl_support_tickets'
        ) THEN
            EXECUTE format('
                ALTER TABLE %I.tbl_support_tickets 
                ADD COLUMN IF NOT EXISTS "Status" VARCHAR(50) NOT NULL DEFAULT ''New'';

                CREATE INDEX IF NOT EXISTS idx_tbl_support_tickets_status
                ON %I.tbl_support_tickets ("Status");
            ', r.schema_name, r.schema_name);
        END IF;
    END LOOP;
END $$;
