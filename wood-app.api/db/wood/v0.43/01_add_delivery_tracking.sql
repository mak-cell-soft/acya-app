-- Migration: v0.43 / 01_add_delivery_tracking.sql
-- Description: Creates tbl_delivery_tracking across all tenant schemas and public schema.
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
        -- Verify that prerequisite tables exist in this schema
        IF EXISTS (
            SELECT 1 FROM information_schema.tables WHERE table_schema = r.schema_name AND table_name = 'tbl_document'
        ) AND EXISTS (
            SELECT 1 FROM information_schema.tables WHERE table_schema = r.schema_name AND table_name = 'tbl_vehicle'
        ) THEN
            EXECUTE format('
                CREATE TABLE IF NOT EXISTS %I.tbl_delivery_tracking (
                    id SERIAL PRIMARY KEY,
                    document_id INTEGER NOT NULL,
                    vehicle_id INTEGER NOT NULL,
                    transporter_id INTEGER NULL,
                    customer_id INTEGER NOT NULL,
                    customer_name VARCHAR(255) NULL,
                    driver_name VARCHAR(255) NULL,
                    departure_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    return_date TIMESTAMPTZ NULL,
                    delivery_address TEXT NULL,
                    status INTEGER NOT NULL DEFAULT 1,
                    notes TEXT NULL,
                    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_by_id INTEGER NULL,
                    CONSTRAINT fk_tbl_delivery_tracking_tbl_document 
                        FOREIGN KEY (document_id) REFERENCES %I.tbl_document(id) ON DELETE CASCADE,
                    CONSTRAINT fk_tbl_delivery_tracking_tbl_vehicle 
                        FOREIGN KEY (vehicle_id) REFERENCES %I.tbl_vehicle(id) ON DELETE RESTRICT,
                    CONSTRAINT fk_tbl_delivery_tracking_tbl_transporter 
                        FOREIGN KEY (transporter_id) REFERENCES %I.tbl_transporter(id) ON DELETE SET NULL,
                    CONSTRAINT fk_tbl_delivery_tracking_tbl_counter_part 
                        FOREIGN KEY (customer_id) REFERENCES %I.tbl_counter_part(id) ON DELETE RESTRICT,
                    CONSTRAINT fk_tbl_delivery_tracking_tbl_app_user 
                        FOREIGN KEY (updated_by_id) REFERENCES %I.tbl_app_user(id) ON DELETE SET NULL
                );

                CREATE UNIQUE INDEX IF NOT EXISTS idx_tbl_delivery_tracking_doc_active 
                    ON %I.tbl_delivery_tracking (document_id) 
                    WHERE is_deleted = false;

                CREATE INDEX IF NOT EXISTS idx_tbl_delivery_tracking_vehicle_date 
                    ON %I.tbl_delivery_tracking (vehicle_id, departure_date DESC);

                CREATE INDEX IF NOT EXISTS idx_tbl_delivery_tracking_customer_date 
                    ON %I.tbl_delivery_tracking (customer_id, departure_date DESC);

                CREATE INDEX IF NOT EXISTS idx_tbl_delivery_tracking_status 
                    ON %I.tbl_delivery_tracking (status) 
                    WHERE is_deleted = false;
            ', r.schema_name, r.schema_name, r.schema_name, r.schema_name, r.schema_name, r.schema_name, 
               r.schema_name, r.schema_name, r.schema_name, r.schema_name);

            -- Record in EF Migrations History if present in schema
            IF EXISTS (
                SELECT 1 FROM information_schema.tables WHERE table_schema = r.schema_name AND table_name = '__EFMigrationsHistory'
            ) THEN
                EXECUTE format('
                    INSERT INTO %I."__EFMigrationsHistory" ("MigrationId", "ProductVersion")
                    VALUES (''20261109110000_AddDeliveryTrackingTable'', ''7.0.20'')
                    ON CONFLICT ("MigrationId") DO NOTHING;
                ', r.schema_name);
            END IF;
        END IF;
    END LOOP;
END $$;

