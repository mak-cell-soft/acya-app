-- Migration: v0.30 / V0.30__add_mobile_builds.sql
-- Description: Add central bo_tbl_mobile_builds table to public schema for tenant mobile builds & releases
-- Note: As a cross-tenant artifact registry, this table resides in public schema matching MasterDbContext

CREATE TABLE IF NOT EXISTS public.bo_tbl_mobile_builds (
    "Id" SERIAL PRIMARY KEY,
    "TenantId" VARCHAR(100) NOT NULL,
    "Version" VARCHAR(50) NOT NULL,
    "BuildNumber" INTEGER NOT NULL,
    "Status" VARCHAR(50) NOT NULL DEFAULT 'Pending',
    "ArtifactPath" VARCHAR(500),
    "ArtifactSize" BIGINT,
    "Sha256" VARCHAR(128),
    "ReleaseNotes" TEXT,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "StartedAt" TIMESTAMPTZ,
    "CompletedAt" TIMESTAMPTZ,
    "ErrorMessage" TEXT,
    "CreatedBy" VARCHAR(200),
    "GitCommitHash" VARCHAR(100),
    "GitBranch" VARCHAR(100),
    "WorkflowRunId" VARCHAR(100),
    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_bo_tbl_mobile_builds_tenant_id ON public.bo_tbl_mobile_builds ("TenantId");
CREATE INDEX IF NOT EXISTS idx_bo_tbl_mobile_builds_tenant_status ON public.bo_tbl_mobile_builds ("TenantId", "Status");
CREATE INDEX IF NOT EXISTS idx_bo_tbl_mobile_builds_tenant_build ON public.bo_tbl_mobile_builds ("TenantId", "BuildNumber");
