-- Migration: v0.31 / V0.31__add_mobile_builds_concurrency_index.sql
-- Description: Add partial unique index on bo_tbl_mobile_builds to prevent concurrent Pending/Building builds per tenant
-- Note: Ensures at most one build in Pending or Building state can exist simultaneously for any given tenant

CREATE UNIQUE INDEX IF NOT EXISTS uq_bo_tbl_mobile_builds_active_tenant
ON public.bo_tbl_mobile_builds ("TenantId")
WHERE "Status" IN ('Pending', 'Building') AND "IsActive" = TRUE;
