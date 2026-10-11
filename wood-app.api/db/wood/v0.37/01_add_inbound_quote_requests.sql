-- Migration: v0.37 / 01_add_inbound_quote_requests.sql
-- Description: Adds tbl_inbound_quote_requests and iswebquoteintakeenabled column on tbl_enterprise across all tenant schemas.
-- Multi-tenant safe: iterates across all tenant schemas and public schema.
-- Pilot activation: Enables iswebquoteintakeenabled strictly for tenant_socofeb.

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name LIKE 'tenant_%' OR schema_name = 'public'
    ) LOOP
        EXECUTE format('SET search_path TO %I, public;', r.schema_name);

        -- Only apply to tenant schemas that contain tbl_enterprise
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = r.schema_name AND table_name = 'tbl_enterprise'
        ) THEN
            -- 1. Ensure iswebquoteintakeenabled on tbl_enterprise
            ALTER TABLE tbl_enterprise 
            ADD COLUMN IF NOT EXISTS iswebquoteintakeenabled BOOLEAN DEFAULT FALSE;

            -- Explicit pilot activation for SOCOFEB schema only
            IF r.schema_name = 'tenant_socofeb' THEN
                UPDATE tbl_enterprise SET iswebquoteintakeenabled = TRUE;
            END IF;

            -- 2. Create tbl_inbound_quote_requests
            CREATE TABLE IF NOT EXISTS tbl_inbound_quote_requests (
                "Id" SERIAL PRIMARY KEY,
                "TrackingNumber" VARCHAR(50) NOT NULL,
                "Product" VARCHAR(255) NOT NULL,
                "Quantity" VARCHAR(100) NOT NULL,
                "CustomerName" VARCHAR(150) NOT NULL,
                "CustomerEmail" VARCHAR(150) NOT NULL,
                "CustomerPhone" VARCHAR(50),
                "Message" TEXT,
                "Source" VARCHAR(100) NOT NULL DEFAULT 'socofeb-decor.com',
                "IdempotencyKey" VARCHAR(100) NOT NULL,
                "EnterpriseStatus" INT NOT NULL DEFAULT 0,
                "EnterpriseLeaseExpiresAt" TIMESTAMPTZ,
                "EnterpriseMessageId" VARCHAR(150),
                "EnterpriseRetryCount" INT NOT NULL DEFAULT 0,
                "CustomerStatus" INT NOT NULL DEFAULT 0,
                "CustomerLeaseExpiresAt" TIMESTAMPTZ,
                "CustomerMessageId" VARCHAR(150),
                "CustomerRetryCount" INT NOT NULL DEFAULT 0,
                "NextRetryAt" TIMESTAMPTZ,
                "LastError" VARCHAR(1000),
                "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                "UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            -- 3. Idempotency and Tracking Indexes
            CREATE UNIQUE INDEX IF NOT EXISTS idx_tbl_inbound_quote_requests_idempotency_key
            ON tbl_inbound_quote_requests ("IdempotencyKey");

            CREATE UNIQUE INDEX IF NOT EXISTS idx_tbl_inbound_quote_requests_tracking_number
            ON tbl_inbound_quote_requests ("TrackingNumber");

            -- 4. Recovery Worker Indexes
            CREATE INDEX IF NOT EXISTS idx_tbl_inbound_quote_requests_enterprise_status
            ON tbl_inbound_quote_requests ("EnterpriseStatus", "EnterpriseRetryCount", "NextRetryAt");

            CREATE INDEX IF NOT EXISTS idx_tbl_inbound_quote_requests_customer_status
            ON tbl_inbound_quote_requests ("CustomerStatus", "CustomerRetryCount", "NextRetryAt");
        END IF;

    END LOOP;
END $$;
