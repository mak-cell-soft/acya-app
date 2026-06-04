-- Add klabiamine@gmail.com as admin with default admin permissions
INSERT INTO "tbl_user_permissions" ("UserId", "Permissions", "UpdatedAt")
SELECT "id", 
       '{"Articles": {"CanRead": true, "CanAdd": true, "CanUpdate": true, "CanDelete": true}, "Customers": {"CanRead": true, "CanAdd": true, "CanUpdate": true, "CanDelete": true}, "Providers": {"CanRead": true, "CanAdd": true, "CanUpdate": true, "CanDelete": true}, "Purchases": {"CanRead": true, "CanAdd": true, "CanUpdate": true, "CanDelete": true}, "Sales": {"CanRead": true, "CanAdd": true, "CanUpdate": true, "CanDelete": true}, "Stock": {"CanRead": true, "CanAdd": true, "CanUpdate": true, "CanDelete": true}, "Inventory": {"CanRead": true, "CanAdd": true, "CanUpdate": true, "CanDelete": true}, "Accounting": {"CanRead": true, "CanAdd": true, "CanUpdate": true, "CanDelete": true}, "Hr": {"CanRead": true, "CanAdd": true, "CanUpdate": true, "CanDelete": true}, "Configuration": {"CanRead": true, "CanAdd": true, "CanUpdate": true, "CanDelete": true}}'::jsonb, 
       NOW()
FROM "tbl_app_user" 
WHERE "email" = 'sonia.belhaj@bmap-bois.tn' OR "login" = 'sonia.belhaj'
ON CONFLICT ("UserId") DO UPDATE
SET "Permissions" = EXCLUDED."Permissions",
    "UpdatedAt" = EXCLUDED."UpdatedAt";

