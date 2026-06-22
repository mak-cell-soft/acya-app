using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using ms.admin.api.acya.core.Entities;
using ms.admin.api.acya.core.Interfaces;
using Npgsql;
using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace ms.admin.api.acya.infrastructure.Services
{
    public class TenantProvisioningService : ITenantProvisioningService
    {
        private readonly IConfiguration _config;
        private readonly ILogger<TenantProvisioningService> _logger;

        public TenantProvisioningService(IConfiguration config, ILogger<TenantProvisioningService> logger)
        {
            _config = config;
            _logger = logger;
        }

        public async Task<bool> ProvisionTenantAsync(MasterEnterprise enterprise, string adminUsername, string adminEmail, string adminPassword)
        {
            try
            {
                var connStr = _config.GetConnectionString("MasterConnection") ?? throw new InvalidOperationException("Master connection string is missing");
                var scriptPath = _config["MigrationScriptPath"] ?? "/app/db/FullDb_Migration/full_migration.sql";

                _logger.LogInformation("Provisioning tenant {Slug} with schema {Schema} using script {Script}", 
                    enterprise.Slug, enterprise.SchemaName, scriptPath);

                if (!File.Exists(scriptPath))
                {
                    _logger.LogError("Migration script not found at path: {Path}", scriptPath);
                    return false;
                }

                var sqlScript = await File.ReadAllTextAsync(scriptPath);

                using (var conn = new NpgsqlConnection(connStr))
                {
                    await conn.OpenAsync();

                    // 1. Create Schema
                    using (var cmd = new NpgsqlCommand($"CREATE SCHEMA IF NOT EXISTS {enterprise.SchemaName};", conn))
                    {
                        await cmd.ExecuteNonQueryAsync();
                    }

                    // 2. Execute migration script inside schema search path
                    // Set search path first on connection session
                    using (var cmd = new NpgsqlCommand($"SET search_path TO {enterprise.SchemaName};", conn))
                    {
                        await cmd.ExecuteNonQueryAsync();
                    }

                    // Run the migration script
                    using (var cmd = new NpgsqlCommand(sqlScript, conn))
                    {
                        cmd.CommandTimeout = 300; // 5 minutes timeout for massive schema migration
                        await cmd.ExecuteNonQueryAsync();
                    }

                    // 3. Seed initial admin user credentials inside the schema search path
                    _logger.LogInformation("Seeding admin user for tenant {Slug}...", enterprise.Slug);
                    
                    using var hmac = new HMACSHA512();
                    byte[] passwordHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(adminPassword));
                    byte[] passwordSalt = hmac.Key;

                    // Insert Person
                    long personId;
                    using (var cmd = new NpgsqlCommand($@"
                        SET search_path TO {enterprise.SchemaName};
                        INSERT INTO tbl_person (guid, firstname, lastname, fullname, idrole, isdeleted, isappuser, creationdate, updatedate)
                        VALUES (@guid, 'Admin', 'Tenant', 'Admin Tenant', 10, false, true, NOW(), NOW())
                        RETURNING id;", conn))
                    {
                        cmd.Parameters.AddWithValue("guid", Guid.NewGuid());
                        personId = Convert.ToInt64(await cmd.ExecuteScalarAsync());
                    }

                    // Insert App User
                    long userId;
                    using (var cmd = new NpgsqlCommand($@"
                        SET search_path TO {enterprise.SchemaName};
                        INSERT INTO tbl_app_user (login, email, isactive, passwordhash, passwordsalt, idperson)
                        VALUES (@login, @email, true, @passwordhash, @passwordsalt, @idperson)
                        RETURNING id;", conn))
                    {
                        cmd.Parameters.AddWithValue("login", adminUsername.ToLower());
                        cmd.Parameters.AddWithValue("email", adminEmail.ToLower());
                        cmd.Parameters.AddWithValue("passwordhash", passwordHash);
                        cmd.Parameters.AddWithValue("passwordsalt", passwordSalt);
                        cmd.Parameters.AddWithValue("idperson", personId);
                        userId = Convert.ToInt64(await cmd.ExecuteScalarAsync());
                    }

                    // Insert User Permissions (Grant all modules access)
                    using (var cmd = new NpgsqlCommand($@"
                        SET search_path TO {enterprise.SchemaName};
                        INSERT INTO tbl_user_permissions (""UserId"", ""Permissions"", ""UpdatedAt"")
                        VALUES (@userId, @permissions::jsonb, NOW());", conn))
                    {
                        cmd.Parameters.AddWithValue("userId", userId);
                        cmd.Parameters.AddWithValue("permissions", @"{
                          ""Analytics"": {""CanRead"": true, ""CanAdd"": true, ""CanUpdate"": true, ""CanDelete"": true},
                          ""Articles"": {""CanRead"": true, ""CanAdd"": true, ""CanUpdate"": true, ""CanDelete"": true},
                          ""Customers"": {""CanRead"": true, ""CanAdd"": true, ""CanUpdate"": true, ""CanDelete"": true},
                          ""Providers"": {""CanRead"": true, ""CanAdd"": true, ""CanUpdate"": true, ""CanDelete"": true},
                          ""Purchases"": {""CanRead"": true, ""CanAdd"": true, ""CanUpdate"": true, ""CanDelete"": true},
                          ""Sales"": {""CanRead"": true, ""CanAdd"": true, ""CanUpdate"": true, ""CanDelete"": true},
                          ""Stock"": {""CanRead"": true, ""CanAdd"": true, ""CanUpdate"": true, ""CanDelete"": true},
                          ""Inventory"": {""CanRead"": true, ""CanAdd"": true, ""CanUpdate"": true, ""CanDelete"": true},
                          ""Accounting"": {""CanRead"": true, ""CanAdd"": true, ""CanUpdate"": true, ""CanDelete"": true},
                          ""Vehicles"": {""CanRead"": true, ""CanAdd"": true, ""CanUpdate"": true, ""CanDelete"": true},
                          ""HR"": {""CanRead"": true, ""CanAdd"": true, ""CanUpdate"": true, ""CanDelete"": true},
                          ""Configuration"": {""CanRead"": true, ""CanAdd"": true, ""CanUpdate"": true, ""CanDelete"": true}
                        }");
                        await cmd.ExecuteNonQueryAsync();
                    }
                }

                _logger.LogInformation("Tenant {Slug} provisioned successfully.", enterprise.Slug);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to provision tenant {Slug}", enterprise.Slug);
                return false;
            }
        }

        public async Task<bool> DeprovisionTenantAsync(MasterEnterprise enterprise)
        {
            try
            {
                var connStr = _config.GetConnectionString("MasterConnection") ?? throw new InvalidOperationException("Master connection string is missing");
                
                _logger.LogInformation("Deprovisioning tenant {Slug} by dropping schema {Schema}", 
                    enterprise.Slug, enterprise.SchemaName);

                using (var conn = new NpgsqlConnection(connStr))
                {
                    await conn.OpenAsync();

                    // Drop schema CASCADE to remove all tables, views, triggers, etc.
                    using (var cmd = new NpgsqlCommand($"DROP SCHEMA IF EXISTS {enterprise.SchemaName} CASCADE;", conn))
                    {
                        await cmd.ExecuteNonQueryAsync();
                    }
                }

                _logger.LogInformation("Tenant {Slug} schema dropped successfully.", enterprise.Slug);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to deprovision tenant {Slug}", enterprise.Slug);
                return false;
            }
        }
    }
}
