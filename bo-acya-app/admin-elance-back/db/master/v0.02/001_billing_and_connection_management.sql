-- Migration: v0.02 / 001_billing_and_connection_management.sql
-- Description: Enhances SaaS billing, subscription lifecycle, configurable connection limits (MaxConnectedUsers = 5),
--              active session concurrency tracking, configurable reminder intervals, and TND currency standardization.
-- Target Schema: public (Master SaaS registry)

-- 1. Add MaxConnectedUsers column to public.bo_tbl_enterprise (default 5 concurrent users)
ALTER TABLE public.bo_tbl_enterprise
    ADD COLUMN IF NOT EXISTS "MaxConnectedUsers" INTEGER NOT NULL DEFAULT 5;

-- Standardize default currency on master enterprise records where null or empty (preserving existing financial history)
UPDATE public.bo_tbl_enterprise
SET "Currency" = 'TND'
WHERE "Currency" IS NULL OR TRIM("Currency") = '';

-- 2. Create public.bo_tbl_tenant_active_sessions for server-side concurrent session enforcement
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

-- 3. Seed configurable payment & subscription reminder intervals in public.bo_tbl_platform_settings
CREATE TABLE IF NOT EXISTS public.bo_tbl_platform_settings (
    "Key" VARCHAR(100) PRIMARY KEY,
    "Value" TEXT NOT NULL,
    "UpdatedAt" TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.bo_tbl_platform_settings ("Key", "Value", "UpdatedAt")
VALUES (
    'BillingReminderIntervals',
    '{"beforeDueDays":[7,3],"onDueDate":true,"afterDueIntervalDays":7,"subscriptionExpiringBeforeDays":[7,3]}',
    NOW()
)
ON CONFLICT ("Key") DO NOTHING;
