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
                    ""Notes"" TEXT,
                    ""LogoUrl"" VARCHAR(255),
                    ""FaviconUrl"" VARCHAR(255),
                    ""PrimaryColor"" VARCHAR(50),
                    ""CustomDomain"" VARCHAR(255),
                    ""Language"" VARCHAR(10),
                    ""Currency"" VARCHAR(10),
                    ""CustomDomainConfigured"" BOOLEAN DEFAULT FALSE
                );
            ");

            // Ensure columns added in updates exist in case the table was created manually before
            context.Database.ExecuteSqlRaw(@"
                ALTER TABLE public.bo_tbl_enterprise ADD COLUMN IF NOT EXISTS ""ActivatedAt"" TIMESTAMPTZ;
                ALTER TABLE public.bo_tbl_enterprise ADD COLUMN IF NOT EXISTS ""Status"" VARCHAR(50) DEFAULT 'Pending';
                ALTER TABLE public.bo_tbl_enterprise ADD COLUMN IF NOT EXISTS ""Notes"" TEXT;
                ALTER TABLE public.bo_tbl_enterprise ADD COLUMN IF NOT EXISTS ""LogoUrl"" VARCHAR(255);
                ALTER TABLE public.bo_tbl_enterprise ADD COLUMN IF NOT EXISTS ""FaviconUrl"" VARCHAR(255);
                ALTER TABLE public.bo_tbl_enterprise ADD COLUMN IF NOT EXISTS ""PrimaryColor"" VARCHAR(50);
                ALTER TABLE public.bo_tbl_enterprise ADD COLUMN IF NOT EXISTS ""CustomDomain"" VARCHAR(255);
                ALTER TABLE public.bo_tbl_enterprise ADD COLUMN IF NOT EXISTS ""Language"" VARCHAR(10);
                ALTER TABLE public.bo_tbl_enterprise ADD COLUMN IF NOT EXISTS ""Currency"" VARCHAR(10);
                ALTER TABLE public.bo_tbl_enterprise ADD COLUMN IF NOT EXISTS ""CustomDomainConfigured"" BOOLEAN DEFAULT FALSE;
            ");

            // Create SaaS lifecycle tables
            context.Database.ExecuteSqlRaw(@"
                CREATE TABLE IF NOT EXISTS public.bo_tbl_tenant_subscriptions (
                    ""Id"" BIGSERIAL PRIMARY KEY,
                    ""TenantId"" BIGINT NOT NULL REFERENCES public.bo_tbl_enterprise(""Id"") ON DELETE CASCADE,
                    ""Plan"" VARCHAR(50) NOT NULL,
                    ""Status"" VARCHAR(50) NOT NULL,
                    ""StartDate"" TIMESTAMPTZ NOT NULL,
                    ""EndDate"" TIMESTAMPTZ NOT NULL,
                    ""Price"" NUMERIC(18, 2) NOT NULL,
                    ""CreatedAt"" TIMESTAMPTZ DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS public.bo_tbl_tenant_invoices (
                    ""Id"" BIGSERIAL PRIMARY KEY,
                    ""TenantId"" BIGINT NOT NULL REFERENCES public.bo_tbl_enterprise(""Id"") ON DELETE CASCADE,
                    ""InvoiceNumber"" VARCHAR(100) UNIQUE NOT NULL,
                    ""Amount"" NUMERIC(18, 2) NOT NULL,
                    ""Currency"" VARCHAR(10) NOT NULL,
                    ""Status"" VARCHAR(50) NOT NULL,
                    ""BillingDate"" TIMESTAMPTZ NOT NULL,
                    ""DueDate"" TIMESTAMPTZ NOT NULL,
                    ""CreatedAt"" TIMESTAMPTZ DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS public.bo_tbl_tenant_payments (
                    ""Id"" BIGSERIAL PRIMARY KEY,
                    ""TenantId"" BIGINT NOT NULL REFERENCES public.bo_tbl_enterprise(""Id"") ON DELETE CASCADE,
                    ""InvoiceId"" BIGINT NOT NULL REFERENCES public.bo_tbl_tenant_invoices(""Id"") ON DELETE CASCADE,
                    ""Amount"" NUMERIC(18, 2) NOT NULL,
                    ""PaymentDate"" TIMESTAMPTZ NOT NULL,
                    ""PaymentMethod"" VARCHAR(50) NOT NULL,
                    ""TransactionId"" VARCHAR(100),
                    ""Status"" VARCHAR(50) NOT NULL,
                    ""CreatedAt"" TIMESTAMPTZ DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS public.bo_tbl_master_audit_logs (
                    ""Id"" BIGSERIAL PRIMARY KEY,
                    ""TenantId"" BIGINT REFERENCES public.bo_tbl_enterprise(""Id"") ON DELETE SET NULL,
                    ""Action"" VARCHAR(100) NOT NULL,
                    ""Details"" TEXT,
                    ""PerformedBy"" VARCHAR(100) NOT NULL,
                    ""Timestamp"" TIMESTAMPTZ DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS public.bo_tbl_backup_jobs (
                    ""Id"" BIGSERIAL PRIMARY KEY,
                    ""TenantId"" BIGINT NOT NULL REFERENCES public.bo_tbl_enterprise(""Id"") ON DELETE CASCADE,
                    ""Type"" VARCHAR(50) NOT NULL,
                    ""Status"" VARCHAR(50) NOT NULL,
                    ""FilePath"" VARCHAR(255) NOT NULL,
                    ""CreatedAt"" TIMESTAMPTZ DEFAULT NOW(),
                    ""CompletedAt"" TIMESTAMPTZ,
                    ""ErrorMessage"" TEXT
                );
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
