-- Crée le schema public et la table de registre des tenants dans acya-app-bo

CREATE TABLE IF NOT EXISTS bo_tbl_enterprise (
    "Id" BIGSERIAL PRIMARY KEY,
    "Slug" VARCHAR(100) UNIQUE NOT NULL,
    "Name" VARCHAR(255) NOT NULL,
    "Email" VARCHAR(255),
    "Phone" VARCHAR(50),
    "SchemaName" VARCHAR(100) UNIQUE NOT NULL,
    "ConnectionString" TEXT NOT NULL,
    "IsActive" BOOLEAN DEFAULT FALSE,
    "Plan" VARCHAR(50) DEFAULT 'Trial',
    "Status" VARCHAR(50) DEFAULT 'Pending',
    "CreatedAt" TIMESTAMPTZ DEFAULT NOW(),
    "ActivatedAt" TIMESTAMPTZ,
    "Notes" TEXT
);

CREATE UNIQUE INDEX idx_enterprise_slug_active
    ON bo_tbl_enterprise("Slug")
    WHERE "IsActive" = TRUE;

-- Table Super Admin Users
CREATE TABLE IF NOT EXISTS bo_tbl_super_admin_users (
    "Id" BIGSERIAL PRIMARY KEY,
    "Username" VARCHAR(100) UNIQUE NOT NULL,
    "PasswordHash" VARCHAR(255) NOT NULL,
    "Email" VARCHAR(255),
    "IsActive" BOOLEAN DEFAULT TRUE,
    "CreatedAt" TIMESTAMPTZ DEFAULT NOW()
);
