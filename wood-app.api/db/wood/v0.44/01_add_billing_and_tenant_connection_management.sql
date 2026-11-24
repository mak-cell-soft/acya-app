-- Migration: v0.44 / 01_add_billing_and_tenant_connection_management.sql
-- Description: Adds MaxConnectedUsers (default 5) to public.bo_tbl_enterprise, creates
--              public.bo_tbl_tenant_active_sessions for concurrent session tracking,
--              seeds BillingReminderIntervals in public.bo_tbl_platform_settings,
--              and adds an index on (RelatedEntityType, RelatedEntityId) in tenant AppNotifications tables
--              for fast idempotent billing reminder deduplication.

-- 1. Master public schema updates
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'bo_tbl_enterprise'
    ) THEN
        ALTER TABLE public.bo_tbl_enterprise
            ADD COLUMN IF NOT EXISTS "MaxConnectedUsers" INTEGER NOT NULL DEFAULT 5;

        UPDATE public.bo_tbl_enterprise
        SET "Currency" = 'TND'
        WHERE "Currency" IS NULL OR TRIM("Currency") = '';

        CREATE TABLE IF NOT EXISTS public.bo_tbl_tenant_active_sessions (
            "Id" BIGSERIAL PRIMARY KEY,
            "SessionId" VARCHAR(100) UNIQUE NOT NULL,
            "TenantId" BIGINT NOT NULL REFERENCES public.bo_tbl_enterprise("Id") ON DELETE CASCADE,
            "TenantSlug" VARCHAR(100) NOT NULL,
            "UserId" INTEGER NOT NULL,
            "Username" VARCHAR(150) NOT NULL,
            "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            "ExpiresAt" TIMESTAMPTZ NOT NULL,
            "LastActivityAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            "IsRevoked" BOOLEAN NOT NULL DEFAULT FALSE,
            "RevokedAt" TIMESTAMPTZ
        );

        CREATE INDEX IF NOT EXISTS idx_bo_tbl_tenant_active_sessions_tenant_active
            ON public.bo_tbl_tenant_active_sessions ("TenantId", "IsRevoked", "ExpiresAt");

        CREATE INDEX IF NOT EXISTS idx_bo_tbl_tenant_active_sessions_slug_active
            ON public.bo_tbl_tenant_active_sessions ("TenantSlug", "IsRevoked", "ExpiresAt");
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'bo_tbl_platform_settings'
    ) THEN
        INSERT INTO public.bo_tbl_platform_settings ("Key", "Value", "UpdatedAt")
        VALUES (
            'BillingReminderIntervals',
            '{"beforeDueDays":[7,3],"onDueDate":true,"afterDueIntervalDays":7,"subscriptionExpiringBeforeDays":[7,3]}',
            NOW()
        )
        ON CONFLICT ("Key") DO NOTHING;
    END IF;
END $$;

-- 2. Per-tenant AppNotifications deduplication index across all tenant schemas
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
            WHERE table_schema = r.schema_name AND table_name = 'AppNotifications'
        ) THEN
            EXECUTE format('
                CREATE INDEX IF NOT EXISTS ix_app_notifications_related_entity
                ON %I."AppNotifications" ("RelatedEntityType", "RelatedEntityId");

                CREATE UNIQUE INDEX IF NOT EXISTS uq_app_notifications_saas_billing_event
                ON %I."AppNotifications" ("RelatedEntityType", "RelatedEntityId")
                WHERE "RelatedEntityType" IN (''SaaSInvoice'', ''SaaSSubscription'')
                  AND "RelatedEntityId" IS NOT NULL;
            ', r.schema_name, r.schema_name);
        END IF;
    END LOOP;
END $$;
