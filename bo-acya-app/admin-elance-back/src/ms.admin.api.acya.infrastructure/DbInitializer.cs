using Microsoft.EntityFrameworkCore;
using ms.admin.api.acya.core.Entities;
using System;
using System.Linq;

namespace ms.admin.api.acya.infrastructure
{
    public static class DbInitializer
    {
        public static void Initialize(MasterDbContext context)
        {
            // 1. Create tables if not exist using raw SQL (preserving exact case for EF compatibility)
            context.Database.ExecuteSqlRaw(@"
                CREATE TABLE IF NOT EXISTS public.bo_tbl_enterprise (
                    ""Id"" BIGSERIAL PRIMARY KEY,
                    ""Slug"" VARCHAR(100) UNIQUE NOT NULL,
                    ""Name"" VARCHAR(255) NOT NULL,
                    ""Email"" VARCHAR(255),
                    ""Phone"" VARCHAR(50),
                    ""SchemaName"" VARCHAR(100) UNIQUE NOT NULL,
                    ""ConnectionString"" TEXT NOT NULL,
                    ""IsActive"" BOOLEAN DEFAULT FALSE,
                    ""Plan"" VARCHAR(50) DEFAULT 'Trial',
                    ""Status"" VARCHAR(50) DEFAULT 'Pending',
                    ""CreatedAt"" TIMESTAMPTZ DEFAULT NOW(),
                    ""ActivatedAt"" TIMESTAMPTZ,
                    ""Notes"" TEXT
                );
            ");

            // Ensure columns added in updates exist in case the table was created manually before
            context.Database.ExecuteSqlRaw(@"
                ALTER TABLE public.bo_tbl_enterprise ADD COLUMN IF NOT EXISTS ""ActivatedAt"" TIMESTAMPTZ;
                ALTER TABLE public.bo_tbl_enterprise ADD COLUMN IF NOT EXISTS ""Status"" VARCHAR(50) DEFAULT 'Pending';
                ALTER TABLE public.bo_tbl_enterprise ADD COLUMN IF NOT EXISTS ""Notes"" TEXT;
            ");

            context.Database.ExecuteSqlRaw(@"
                CREATE TABLE IF NOT EXISTS public.bo_tbl_super_admin_users (
                    ""Id"" BIGSERIAL PRIMARY KEY,
                    ""Username"" VARCHAR(100) UNIQUE NOT NULL,
                    ""PasswordHash"" VARCHAR(255) NOT NULL,
                    ""Email"" VARCHAR(255),
                    ""IsActive"" BOOLEAN DEFAULT TRUE,
                    ""CreatedAt"" TIMESTAMPTZ DEFAULT NOW()
                );
            ");

            // 2. Seed super admin user if not exists
            var hasAdmin = context.SuperAdminUsers.Any(u => u.Username == "admin");
            if (!hasAdmin)
            {
                context.SuperAdminUsers.Add(new SuperAdminUser
                {
                    Username = "admin",
                    PasswordHash = "adminpassword", // Match AuthController plain text comparison
                    Email = "admin@acya.site",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                });
                context.SaveChanges();
            }
        }
    }
}
