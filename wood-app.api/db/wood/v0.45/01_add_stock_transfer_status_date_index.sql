-- Migration: v0.45/01_add_stock_transfer_status_date_index.sql
-- Description: Add composite (status, transferdate DESC) and partial pending (transferdate DESC WHERE status = 1)
--              indexes on tbl_stock_transfer across all tenant schemas and public to accelerate historical
--              pending transfer searches and paginated transfer register queries.
-- Safety: Strictly idempotent (IF EXISTS / IF NOT EXISTS), no schema/column modifications, no data mutations.

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
            WHERE table_schema = r.schema_name
              AND table_name = 'tbl_stock_transfer'
        ) THEN
            EXECUTE format('
                CREATE INDEX IF NOT EXISTS ix_tbl_stock_transfer_status_transferdate
                ON %I.tbl_stock_transfer (status, transferdate DESC);
            ', r.schema_name);

            EXECUTE format('
                CREATE INDEX IF NOT EXISTS ix_tbl_stock_transfer_pending_date
                ON %I.tbl_stock_transfer (transferdate DESC)
                WHERE status = 1;
            ', r.schema_name);
        END IF;
    END LOOP;
END $$;
