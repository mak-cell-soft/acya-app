-- Create the UserPermissions table.
-- Stores a JSONB permissions blob per AppUser.
-- One row per user; null = no explicit grants (defaults apply).
CREATE TABLE IF NOT EXISTS "tbl_user_permissions" (
    "Id"          SERIAL PRIMARY KEY,
    "UserId"      INTEGER NOT NULL UNIQUE,
    "Permissions" JSONB   NOT NULL DEFAULT '{}',
    "UpdatedAt"   TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_userperm_user FOREIGN KEY ("UserId") REFERENCES "tbl_app_user"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_userperm_userid ON "tbl_user_permissions" ("UserId");
