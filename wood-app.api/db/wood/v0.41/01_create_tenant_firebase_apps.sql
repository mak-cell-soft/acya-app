-- Migration: v0.41 / 01_create_tenant_firebase_apps.sql
-- Description: Central registry for tenant Firebase Android applications
-- Schema: public (Master database cross-tenant registry matching MasterDbContext)
-- Note: Idempotent table and index creation with foreign key to public.bo_tbl_enterprise("Slug").
--       Does not loop over tenant schemas because this is a master cross-tenant registry.

CREATE TABLE IF NOT EXISTS public.bo_tbl_tenant_firebase_apps (
    "Id" SERIAL PRIMARY KEY,
    "TenantId" VARCHAR(100) NOT NULL REFERENCES public.bo_tbl_enterprise ("Slug") ON DELETE CASCADE,
    "FirebaseProjectId" VARCHAR(100) NOT NULL,
    "FirebaseAppId" VARCHAR(100),
    "PackageName" VARCHAR(200) NOT NULL,
    "DisplayName" VARCHAR(200) NOT NULL,
    "GoogleServicesJson" TEXT,
    "Status" VARCHAR(50) NOT NULL DEFAULT 'Pending',
    "Sha1Fingerprint" VARCHAR(100),
    "Sha256Fingerprint" VARCHAR(100),
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_bo_tbl_tenant_firebase_apps_tenant
ON public.bo_tbl_tenant_firebase_apps ("TenantId");

CREATE UNIQUE INDEX IF NOT EXISTS uq_bo_tbl_tenant_firebase_apps_package
ON public.bo_tbl_tenant_firebase_apps ("PackageName");

CREATE INDEX IF NOT EXISTS idx_bo_tbl_tenant_firebase_apps_project
ON public.bo_tbl_tenant_firebase_apps ("FirebaseProjectId");

CREATE INDEX IF NOT EXISTS idx_bo_tbl_tenant_firebase_apps_status
ON public.bo_tbl_tenant_firebase_apps ("Status");
