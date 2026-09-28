-- Migration: v0.32 / V0.32__add_mobile_releases.sql
-- Description: Add central bo_tbl_mobile_releases table to public schema for tenant mobile release management
-- Note: Represents explicitly published APK builds approved for distribution to tenants.
-- Enforces strictly at most ONE current release per tenant via a partial unique index.

CREATE TABLE IF NOT EXISTS public.bo_tbl_mobile_releases (
    "Id" SERIAL PRIMARY KEY,
    "TenantId" VARCHAR(100) NOT NULL,
    "MobileBuildId" INTEGER NOT NULL REFERENCES public.bo_tbl_mobile_builds("Id") ON DELETE RESTRICT,
    "Version" VARCHAR(50) NOT NULL,
    "BuildNumber" INTEGER NOT NULL,
    "Status" VARCHAR(50) NOT NULL DEFAULT 'Published',
    "IsCurrent" BOOLEAN NOT NULL DEFAULT TRUE,
    "PublishedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "PublishedBy" VARCHAR(200),
    "ReleaseNotes" TEXT,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_bo_tbl_mobile_releases_tenant_id ON public.bo_tbl_mobile_releases ("TenantId");
CREATE INDEX IF NOT EXISTS idx_bo_tbl_mobile_releases_build_id ON public.bo_tbl_mobile_releases ("MobileBuildId");
CREATE INDEX IF NOT EXISTS idx_bo_tbl_mobile_releases_tenant_current ON public.bo_tbl_mobile_releases ("TenantId", "IsCurrent");

-- Enforce exactly at most ONE current release per tenant at the database level
CREATE UNIQUE INDEX IF NOT EXISTS uq_bo_tbl_mobile_releases_current_tenant
ON public.bo_tbl_mobile_releases ("TenantId")
WHERE "IsCurrent" = TRUE;
