using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using ms.admin.api.acya.core.DTOs;
using ms.admin.api.acya.core.Entities;
using ms.admin.api.acya.core.Interfaces;
using Npgsql;
using System;
using System.IO;
using System.Security.Cryptography;
using ms.admin.api.acya.Services;
using System.Collections.Generic;
using System.Text;
using System.Text.RegularExpressions;
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

        public Task<bool> ProvisionTenantAsync(MasterEnterprise enterprise, string adminUsername, string adminEmail, string adminPassword)
        {
            return ProvisionTenantAsync(enterprise, new TenantProvisionDetails
            {
                AdminUsername = adminUsername,
                AdminEmail = adminEmail,
                AdminPassword = adminPassword
            });
        }

        public async Task<bool> ProvisionTenantAsync(MasterEnterprise enterprise, TenantProvisionDetails details)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(enterprise.SchemaName) || !System.Text.RegularExpressions.Regex.IsMatch(enterprise.SchemaName, @"^[a-zA-Z0-9_]+$"))
                {
                    _logger.LogError("Invalid schema name: {SchemaName}", enterprise.SchemaName);
                    return false;
                }

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

                    // 1. Create Schema (clean up any previous incomplete schema if tenant was never activated)
                    if (!enterprise.IsActive)
                    {
                        using (var dropCmd = new NpgsqlCommand($"DROP SCHEMA IF EXISTS \"{enterprise.SchemaName}\" CASCADE;", conn))
                        {
                            await dropCmd.ExecuteNonQueryAsync();
                        }
                    }

                    using (var cmd = new NpgsqlCommand($"CREATE SCHEMA IF NOT EXISTS \"{enterprise.SchemaName}\";", conn))
                    {
                        await cmd.ExecuteNonQueryAsync();
                    }

                    // 2. Execute migration script inside schema search path
                    using (var cmd = new NpgsqlCommand($"SET search_path TO \"{enterprise.SchemaName}\";", conn))
                    {
                        await cmd.ExecuteNonQueryAsync();
                    }

                    using (var cmd = new NpgsqlCommand(sqlScript, conn))
                    {
                        cmd.CommandTimeout = 300; // 5 minutes timeout for massive schema migration
                        await cmd.ExecuteNonQueryAsync();
                    }

                    // 3. Seed initial admin user credentials and enterprise details inside the schema search path
                    _logger.LogInformation("Seeding admin user and enterprise details for tenant {Slug}...", enterprise.Slug);
                    
                    byte[] passwordHash;
                    byte[] passwordSalt;

                    if (details.PrecomputedPasswordHash != null && details.PrecomputedPasswordHash.Length > 0 &&
                        details.PrecomputedPasswordSalt != null && details.PrecomputedPasswordSalt.Length > 0)
                    {
                        passwordHash = details.PrecomputedPasswordHash;
                        passwordSalt = details.PrecomputedPasswordSalt;
                    }
                    else
                    {
                        var pwd = !string.IsNullOrWhiteSpace(details.AdminPassword)
                            ? details.AdminPassword
                            : Guid.NewGuid().ToString("N").Substring(0, 12) + "!";
                        using var hmac = new HMACSHA512();
                        passwordHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(pwd));
                        passwordSalt = hmac.Key;
                    }

                    // Seeding enterprise table inside the schema search path (ID = 1)
                    long enterpriseId = 1;
                    using (var cmd = new NpgsqlCommand($@"
                        SET search_path TO ""{enterprise.SchemaName}"";
                        INSERT INTO tbl_enterprise (
                            id, name, enterpriseguid, description, email, phone, mobileone, mobiletwo, 
                            matriculefiscal, devise, nameresponsable, surnameresponsable, positionresponsable, 
                            siegeaddress, commercialregister, capital, issalingwood, ismanagingconstructions, ismanagingproduction, 
                            logourl, faviconurl, primarycolor, secondarycolor, customdomain, language, currency, 
                            auditretentionmonths, documentnumberingconfig
                        )
                        VALUES (
                            1, @name, @guid, @description, @email, @phone, @mobileone, @mobiletwo, 
                            @matriculefiscal, @devise, @nameresponsable, @surnameresponsable, @positionresponsable, 
                            @siegeaddress, @commercialregister, @capital, @issalingwood, @ismanagingconstructions, @ismanagingproduction, 
                            @logourl, @faviconurl, @primarycolor, @secondarycolor, @customdomain, @language, @currency, 
                            12, @documentnumberingconfig
                        )
                        RETURNING id;", conn))
                    {
                        cmd.Parameters.AddWithValue("name", enterprise.Name);
                        cmd.Parameters.AddWithValue("guid", Guid.NewGuid());
                        cmd.Parameters.AddWithValue("description", (object?)details.Description ?? DBNull.Value);
                        cmd.Parameters.AddWithValue("email", (object?)enterprise.Email ?? DBNull.Value);
                        cmd.Parameters.AddWithValue("phone", (object?)enterprise.Phone ?? DBNull.Value);
                        cmd.Parameters.AddWithValue("mobileone", (object?)details.MobileOne ?? DBNull.Value);
                        cmd.Parameters.AddWithValue("mobiletwo", (object?)details.MobileTwo ?? DBNull.Value);
                        cmd.Parameters.AddWithValue("matriculefiscal", (object?)details.MatriculeFiscal ?? DBNull.Value);
                        cmd.Parameters.AddWithValue("devise", (object?)details.Devise ?? (object?)enterprise.Currency ?? "TND");
                        cmd.Parameters.AddWithValue("nameresponsable", (object?)details.NameResponsable ?? DBNull.Value);
                        cmd.Parameters.AddWithValue("surnameresponsable", (object?)details.SurnameResponsable ?? DBNull.Value);
                        cmd.Parameters.AddWithValue("positionresponsable", (object?)details.PositionResponsable ?? DBNull.Value);
                        cmd.Parameters.AddWithValue("siegeaddress", (object?)details.SiegeAddress ?? DBNull.Value);
                        cmd.Parameters.AddWithValue("commercialregister", (object?)details.CommercialRegister ?? DBNull.Value);
                        cmd.Parameters.AddWithValue("capital", (object?)details.Capital ?? DBNull.Value);
                        cmd.Parameters.AddWithValue("issalingwood", enterprise.IsSalingWood);
                        cmd.Parameters.AddWithValue("ismanagingconstructions", enterprise.IsManagingConstructions);
                        cmd.Parameters.AddWithValue("ismanagingproduction", enterprise.IsManagingProduction);
                        cmd.Parameters.AddWithValue("logourl", (object?)enterprise.LogoUrl ?? DBNull.Value);
                        cmd.Parameters.AddWithValue("faviconurl", (object?)enterprise.FaviconUrl ?? DBNull.Value);
                        cmd.Parameters.AddWithValue("primarycolor", (object?)enterprise.PrimaryColor ?? DBNull.Value);
                        cmd.Parameters.AddWithValue("secondarycolor", (object?)enterprise.SecondaryColor ?? DBNull.Value);
                        cmd.Parameters.AddWithValue("customdomain", (object?)enterprise.CustomDomain ?? DBNull.Value);
                        cmd.Parameters.AddWithValue("language", (object?)enterprise.Language ?? "fr");
                        cmd.Parameters.AddWithValue("currency", (object?)enterprise.Currency ?? "TND");
                        cmd.Parameters.AddWithValue("documentnumberingconfig", @"{""prefixes"":{""1"":""CF"",""2"":""BR"",""3"":""FF"",""4"":""CC"",""5"":""BL"",""6"":""FACT"",""7"":""TR"",""8"":""AVF"",""9"":""AV"",""10"":""INV"",""11"":""DEV""},""yearFormat"":2,""incrementLength"":3}");
                        enterpriseId = Convert.ToInt64(await cmd.ExecuteScalarAsync());
                    }

                    // Seed sales sites if provided
                    long? firstSiteId = null;
                    if (details.Sites != null && details.Sites.Count > 0)
                    {
                        foreach (var site in details.Sites)
                        {
                            if (string.IsNullOrWhiteSpace(site.Address) && string.IsNullOrWhiteSpace(site.Gov)) continue;

                            using (var siteCmd = new NpgsqlCommand($@"
                                SET search_path TO ""{enterprise.SchemaName}"";
                                INSERT INTO tbl_sales_sites (isforsale, gouvernorate, address, isdeleted, enterpriseid)
                                VALUES (@isforsale, @gov, @address, false, @enterpriseid)
                                RETURNING id;", conn))
                            {
                                siteCmd.Parameters.AddWithValue("isforsale", site.IsForSale);
                                siteCmd.Parameters.AddWithValue("gov", (object?)site.Gov ?? DBNull.Value);
                                siteCmd.Parameters.AddWithValue("address", (object?)site.Address ?? DBNull.Value);
                                siteCmd.Parameters.AddWithValue("enterpriseid", enterpriseId);
                                long createdSiteId = Convert.ToInt64(await siteCmd.ExecuteScalarAsync());
                                if (firstSiteId == null)
                                {
                                    firstSiteId = createdSiteId;
                                }
                            }
                        }
                    }

                    // Insert Person
                    string firstName = !string.IsNullOrWhiteSpace(details.AdminSurname) 
                        ? details.AdminSurname 
                        : (!string.IsNullOrWhiteSpace(details.SurnameResponsable) ? details.SurnameResponsable : "Admin");
                    string lastName = !string.IsNullOrWhiteSpace(details.NameResponsable) 
                        ? details.NameResponsable 
                        : details.AdminUsername.ToUpper();
                    string fullName = $"{firstName} {lastName}".Trim();

                    long personId;
                    using (var cmd = new NpgsqlCommand($@"
                        SET search_path TO ""{enterprise.SchemaName}"";
                        INSERT INTO tbl_person (guid, firstname, lastname, fullname, idrole, isdeleted, isappuser, creationdate, updatedate)
                        VALUES (@guid, @firstname, @lastname, @fullname, 10, false, true, NOW(), NOW())
                        RETURNING id;", conn))
                    {
                        cmd.Parameters.AddWithValue("guid", Guid.NewGuid());
                        cmd.Parameters.AddWithValue("firstname", firstName);
                        cmd.Parameters.AddWithValue("lastname", lastName);
                        cmd.Parameters.AddWithValue("fullname", fullName);
                        personId = Convert.ToInt64(await cmd.ExecuteScalarAsync());
                    }

                    // Insert App User
                    long userId;
                    using (var cmd = new NpgsqlCommand($@"
                        SET search_path TO ""{enterprise.SchemaName}"";
                        INSERT INTO tbl_app_user (login, email, isactive, passwordhash, passwordsalt, idperson, enterpriseid, idsalessite)
                        VALUES (@login, @email, true, @passwordhash, @passwordsalt, @idperson, @enterpriseid, @idsalessite)
                        RETURNING id;", conn))
                    {
                        cmd.Parameters.AddWithValue("login", details.AdminUsername.ToLower());
                        cmd.Parameters.AddWithValue("email", details.AdminEmail.ToLower());
                        cmd.Parameters.AddWithValue("passwordhash", passwordHash);
                        cmd.Parameters.AddWithValue("passwordsalt", passwordSalt);
                        cmd.Parameters.AddWithValue("idperson", personId);
                        cmd.Parameters.AddWithValue("enterpriseid", enterpriseId);
                        cmd.Parameters.AddWithValue("idsalessite", (object?)firstSiteId ?? DBNull.Value);
                        userId = Convert.ToInt64(await cmd.ExecuteScalarAsync());
                    }

                    // Insert User Permissions (Grant all modules access)
                    using (var cmd = new NpgsqlCommand($@"
                        SET search_path TO ""{enterprise.SchemaName}"";
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

                    // 4. Seed wood template if required
                    if (enterprise.IsSalingWood)
                    {
                        var woodSeedPath = _config["WoodSeedScriptPath"] ?? "/app/db/wood/v0.10/seed_natural_wood.sql.template";
                        if (!File.Exists(woodSeedPath))
                        {
                            var currentDir = AppDomain.CurrentDomain.BaseDirectory;
                            while (currentDir != null && !Directory.Exists(Path.Combine(currentDir, "db")))
                            {
                                currentDir = Directory.GetParent(currentDir)?.FullName;
                            }
                            if (currentDir != null)
                            {
                                var path1 = Path.Combine(currentDir, "db", "wood", "v0.10", "seed_natural_wood.sql.template");
                                var path2 = Path.Combine(currentDir, "db", "seed_natural_wood.sql.template");
                                woodSeedPath = File.Exists(path1) ? path1 : path2;
                            }
                        }

                        if (File.Exists(woodSeedPath))
                        {
                            _logger.LogInformation("Executing natural wood seed script for tenant {Slug}...", enterprise.Slug);
                            var sql = await File.ReadAllTextAsync(woodSeedPath);
                            sql = sql.Replace("{{APP_USER_ID}}", userId.ToString());

                            using (var cmd = new NpgsqlCommand($@"
                                SET search_path TO ""{enterprise.SchemaName}"";
                                {sql}", conn))
                            {
                                await cmd.ExecuteNonQueryAsync();
                            }
                            _logger.LogInformation("Natural wood seed script executed successfully for tenant {Slug}.", enterprise.Slug);
                        }
                        else
                        {
                            _logger.LogWarning("Natural wood seed script file not found at path: {Path}. Wood seeding skipped.", woodSeedPath);
                        }
                    }
                }

                _logger.LogInformation("Tenant {Slug} provisioned successfully.", enterprise.Slug);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to provision tenant {Slug}", enterprise.Slug);
                try
                {
                    var connStr = _config.GetConnectionString("MasterConnection");
                    if (!string.IsNullOrWhiteSpace(connStr) && !string.IsNullOrWhiteSpace(enterprise.SchemaName))
                    {
                        using var rollbackConn = new NpgsqlConnection(connStr);
                        await rollbackConn.OpenAsync();
                        using var cmd = new NpgsqlCommand($"DROP SCHEMA IF EXISTS \"{enterprise.SchemaName}\" CASCADE;", rollbackConn);
                        await cmd.ExecuteNonQueryAsync();
                        _logger.LogInformation("Successfully rolled back incomplete schema {Schema} for tenant {Slug}", enterprise.SchemaName, enterprise.Slug);
                    }
                }
                catch (Exception rollbackEx)
                {
                    _logger.LogWarning(rollbackEx, "Failed to rollback incomplete schema {Schema} for tenant {Slug}", enterprise.SchemaName, enterprise.Slug);
                }
                return false;
            }
        }

        public async Task<bool> DeprovisionTenantAsync(MasterEnterprise enterprise)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(enterprise.SchemaName) || !System.Text.RegularExpressions.Regex.IsMatch(enterprise.SchemaName, @"^[a-zA-Z0-9_]+$"))
                {
                    _logger.LogError("Invalid schema name for deprovisioning: {SchemaName}", enterprise.SchemaName);
                    return false;
                }

                var connStr = _config.GetConnectionString("MasterConnection") ?? throw new InvalidOperationException("Master connection string is missing");
                
                _logger.LogInformation("Deprovisioning tenant {Slug} by dropping schema {Schema}", 
                    enterprise.Slug, enterprise.SchemaName);

                using (var conn = new NpgsqlConnection(connStr))
                {
                    await conn.OpenAsync();

                    // Drop schema CASCADE to remove all tables, views, triggers, etc.
                    using (var cmd = new NpgsqlCommand($"DROP SCHEMA IF EXISTS \"{enterprise.SchemaName}\" CASCADE;", conn))
                    {
                        await cmd.ExecuteNonQueryAsync();
                    }
                }

                _logger.LogInformation("Tenant {Slug} schema dropped successfully.", enterprise.Slug);

                // 2. Clean up welcome email file on disk
                try
                {
                    var emailPath = Path.Combine("/app", "welcome-emails", $"{enterprise.Slug}.html");
                    if (File.Exists(emailPath))
                    {
                        File.Delete(emailPath);
                        _logger.LogInformation("Deleted welcome email for tenant {Slug}", enterprise.Slug);
                    }
                }
                catch (Exception fileEx)
                {
                    _logger.LogWarning(fileEx, "Failed to delete welcome email for tenant {Slug}", enterprise.Slug);
                }

                // 3. Clean up backup files on disk
                try
                {
                    var backupsDir = "/app/backups";
                    if (Directory.Exists(backupsDir))
                    {
                        var searchPattern = $"backup_{enterprise.Slug}_*.dump";
                        var backupFiles = Directory.GetFiles(backupsDir, searchPattern);
                        foreach (var file in backupFiles)
                        {
                            File.Delete(file);
                            _logger.LogInformation("Deleted backup file {FileName} for tenant {Slug}", Path.GetFileName(file), enterprise.Slug);
                        }
                    }
                }
                catch (Exception backupEx)
                {
                    _logger.LogWarning(backupEx, "Failed to clean up backup files for tenant {Slug}", enterprise.Slug);
                }

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to deprovision tenant {Slug}", enterprise.Slug);
                return false;
            }
        }

        public async Task<ProductionActivationResult> EnsureProductionLaborSchemaAsync(string schemaName)
        {
            try
            {
                // 1. Validate the tenant schema using existing safe identifier rules
                if (string.IsNullOrWhiteSpace(schemaName) || !SchemaSanitizer.IsValidIdentifier(schemaName))
                {
                    _logger.LogError("Invalid tenant schema identifier for production activation: '{SchemaName}'", schemaName);
                    return new ProductionActivationResult
                    {
                        Success = false,
                        ErrorMessage = $"Invalid tenant schema identifier: '{schemaName}'."
                    };
                }

                var connStr = _config.GetConnectionString("MasterConnection")
                    ?? throw new InvalidOperationException("Master connection string is missing");

                using var conn = new NpgsqlConnection(connStr);
                await conn.OpenAsync();

                // 2. Verify schema exists in PostgreSQL
                bool schemaExists;
                using (var cmd = new NpgsqlCommand("SELECT 1 FROM information_schema.schemata WHERE schema_name = @schemaName;", conn))
                {
                    cmd.Parameters.AddWithValue("schemaName", schemaName);
                    schemaExists = await cmd.ExecuteScalarAsync() != null;
                }

                if (!schemaExists)
                {
                    _logger.LogError("Tenant schema '{SchemaName}' does not exist in the database.", schemaName);
                    return new ProductionActivationResult
                    {
                        Success = false,
                        ErrorMessage = $"Tenant schema '{schemaName}' does not exist."
                    };
                }

                // 3. Check whether the required schema objects are already present
                var (isAlreadyComplete, _) = await VerifyProductionLaborSchemaInternalAsync(conn, schemaName);
                if (isAlreadyComplete)
                {
                    _logger.LogInformation("Tenant schema '{SchemaName}' already contains all required production labor-tracking tables, constraints, and indexes.", schemaName);
                    return new ProductionActivationResult
                    {
                        Success = true,
                        AlreadyMigrated = true
                    };
                }

                // 4. Ensure base production tables (production_steps) exist if missing before applying labor tracking
                bool hasProductionSteps;
                using (var cmd = new NpgsqlCommand(
                    "SELECT 1 FROM information_schema.tables WHERE table_schema = @schemaName AND table_name = 'production_steps';", conn))
                {
                    cmd.Parameters.AddWithValue("schemaName", schemaName);
                    hasProductionSteps = await cmd.ExecuteScalarAsync() != null;
                }

                if (!hasProductionSteps)
                {
                    _logger.LogInformation("Tenant schema '{SchemaName}' missing base production_steps table. Provisioning base production module...", schemaName);
                    var baseScriptPath = ResolveBaseProductionScriptPath();
                    if (string.IsNullOrEmpty(baseScriptPath) || !File.Exists(baseScriptPath))
                    {
                        _logger.LogError("Base production module migration script not found for schema '{SchemaName}'.", schemaName);
                        return new ProductionActivationResult
                        {
                            Success = false,
                            ErrorMessage = "Base production module migration script not found."
                        };
                    }

                    var baseSql = await File.ReadAllTextAsync(baseScriptPath);
                    using (var tx = await conn.BeginTransactionAsync())
                    {
                        try
                        {
                            var quotedSchema = SchemaSanitizer.QuoteIdentifier(schemaName);
                            using (var setPathCmd = new NpgsqlCommand($"SET search_path TO {quotedSchema}, public;", conn, tx))
                            {
                                await setPathCmd.ExecuteNonQueryAsync();
                            }

                            using (var baseCmd = new NpgsqlCommand(baseSql, conn, tx))
                            {
                                baseCmd.CommandTimeout = 120;
                                await baseCmd.ExecuteNonQueryAsync();
                            }

                            await tx.CommitAsync();
                            _logger.LogInformation("Base production module provisioned successfully for schema '{SchemaName}'.", schemaName);
                        }
                        catch (Exception ex)
                        {
                            await tx.RollbackAsync();
                            _logger.LogError(ex, "Failed to provision base production tables for schema '{SchemaName}'.", schemaName);
                            return new ProductionActivationResult
                            {
                                Success = false,
                                ErrorMessage = $"Failed to provision base production tables: {ex.Message}"
                            };
                        }
                    }
                }

                // 5. Apply the incremental migration db/wood/v0.39/01_add_production_labor_tracking.sql to that tenant schema ONLY
                var migrationScriptPath = ResolveProductionLaborMigrationScriptPath();
                if (string.IsNullOrEmpty(migrationScriptPath) || !File.Exists(migrationScriptPath))
                {
                    _logger.LogError("Production labor-tracking migration script not found at path: {Path}", migrationScriptPath);
                    return new ProductionActivationResult
                    {
                        Success = false,
                        ErrorMessage = "Authoritative migration script '01_add_production_labor_tracking.sql' not found."
                    };
                }

                var rawMigrationSql = await File.ReadAllTextAsync(migrationScriptPath);

                // Scope authoritative migration strictly to this tenant schema
                var targetSchemaFilter = $"WHERE schema_name = '{schemaName}'";
                var singleTenantSql = Regex.Replace(
                    rawMigrationSql,
                    @"WHERE\s+schema_name\s+LIKE\s+'tenant_%'\s+OR\s+schema_name\s*=\s*'public'",
                    targetSchemaFilter,
                    RegexOptions.IgnoreCase
                );

                if (!singleTenantSql.Contains(targetSchemaFilter))
                {
                    _logger.LogError("Could not safely target single schema '{SchemaName}' in migration script.", schemaName);
                    return new ProductionActivationResult
                    {
                        Success = false,
                        ErrorMessage = "Could not safely target single schema in migration script."
                    };
                }

                _logger.LogInformation("Applying production labor-tracking migration to schema '{SchemaName}'...", schemaName);

                using (var tx = await conn.BeginTransactionAsync())
                {
                    try
                    {
                        using (var cmd = new NpgsqlCommand(singleTenantSql, conn, tx))
                        {
                            cmd.CommandTimeout = 180;
                            await cmd.ExecuteNonQueryAsync();
                        }

                        await tx.CommitAsync();
                        _logger.LogInformation("Applied production labor-tracking migration to schema '{SchemaName}'.", schemaName);
                    }
                    catch (Exception ex)
                    {
                        await tx.RollbackAsync();
                        _logger.LogError(ex, "Failed to execute production labor-tracking migration for schema '{SchemaName}'.", schemaName);
                        return new ProductionActivationResult
                        {
                            Success = false,
                            ErrorMessage = $"Failed to execute migration: {ex.Message}"
                        };
                    }
                }

                // 6. Verify the expected tables, constraints, and indexes
                var (isVerified, missingDetails) = await VerifyProductionLaborSchemaInternalAsync(conn, schemaName);
                if (!isVerified)
                {
                    _logger.LogError("Post-migration verification failed for schema '{SchemaName}': {Missing}", schemaName, missingDetails);
                    return new ProductionActivationResult
                    {
                        Success = false,
                        ErrorMessage = $"Post-migration verification failed: {missingDetails}"
                    };
                }

                _logger.LogInformation("Production labor-tracking schema successfully verified for schema '{SchemaName}'.", schemaName);
                return new ProductionActivationResult
                {
                    Success = true,
                    AlreadyMigrated = false
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error ensuring production labor schema for '{SchemaName}'.", schemaName);
                return new ProductionActivationResult
                {
                    Success = false,
                    ErrorMessage = $"Unexpected error: {ex.Message}"
                };
            }
        }

        private async Task<(bool IsComplete, string? MissingDetails)> VerifyProductionLaborSchemaInternalAsync(
            NpgsqlConnection conn, string schemaName)
        {
            var missing = new List<string>();

            // 1. Verify Expected Tables
            var expectedTables = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "production_step_workers",
                "production_step_work_logs",
                "production_other_work_entries"
            };

            var foundTables = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            using (var cmd = new NpgsqlCommand(
                @"SELECT table_name 
                  FROM information_schema.tables 
                  WHERE table_schema = @schemaName 
                    AND table_name IN ('production_step_workers', 'production_step_work_logs', 'production_other_work_entries');", conn))
            {
                cmd.Parameters.AddWithValue("schemaName", schemaName);
                using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    foundTables.Add(reader.GetString(0));
                }
            }

            foreach (var table in expectedTables)
            {
                if (!foundTables.Contains(table))
                {
                    missing.Add($"Table '{table}'");
                }
            }

            // If tables are missing, don't check indexes/foreign keys on missing tables
            if (missing.Count > 0)
            {
                return (false, string.Join(", ", missing));
            }

            // 2. Verify Expected Indexes
            var expectedIndexes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "idx_step_workers_step",
                "idx_step_workers_person",
                "idx_step_workers_step_person",
                "idx_step_workers_guid",
                "idx_work_logs_step_worker",
                "idx_work_logs_step",
                "idx_work_logs_person_date",
                "idx_work_logs_date",
                "idx_work_logs_guid",
                "idx_other_work_person_date",
                "idx_other_work_date",
                "idx_other_work_guid"
            };

            var foundIndexes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            using (var cmd = new NpgsqlCommand(
                @"SELECT indexname 
                  FROM pg_indexes 
                  WHERE schemaname = @schemaName;", conn))
            {
                cmd.Parameters.AddWithValue("schemaName", schemaName);
                using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    foundIndexes.Add(reader.GetString(0));
                }
            }

            foreach (var idx in expectedIndexes)
            {
                if (!foundIndexes.Contains(idx))
                {
                    missing.Add($"Index '{idx}'");
                }
            }

            // 3. Verify Foreign Key Constraints
            var expectedForeignKeys = new List<(string Table, string ForeignTable)>
            {
                ("production_step_workers", "production_steps"),
                ("production_step_workers", "tbl_person"),
                ("production_step_work_logs", "production_step_workers"),
                ("production_step_work_logs", "production_steps"),
                ("production_step_work_logs", "tbl_person"),
                ("production_other_work_entries", "tbl_person")
            };

            var foundForeignKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            using (var cmd = new NpgsqlCommand(
                @"SELECT 
                    rel.relname AS table_name,
                    frel.relname AS foreign_table_name
                  FROM pg_constraint con
                  JOIN pg_class rel ON rel.oid = con.conrelid
                  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
                  JOIN pg_class frel ON frel.oid = con.confrelid
                  WHERE nsp.nspname = @schemaName
                    AND con.contype = 'f';", conn))
            {
                cmd.Parameters.AddWithValue("schemaName", schemaName);
                using var reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    foundForeignKeys.Add($"{reader.GetString(0)}->{reader.GetString(1)}");
                }
            }

            foreach (var (table, foreignTable) in expectedForeignKeys)
            {
                var key = $"{table}->{foreignTable}";
                if (!foundForeignKeys.Contains(key))
                {
                    missing.Add($"Foreign Key '{table}' -> '{foreignTable}'");
                }
            }

            if (missing.Count > 0)
            {
                return (false, string.Join(", ", missing));
            }

            return (true, null);
        }

        private string? ResolveProductionLaborMigrationScriptPath()
        {
            var configuredPath = _config["ProductionLaborMigrationScriptPath"];
            if (!string.IsNullOrEmpty(configuredPath) && File.Exists(configuredPath))
            {
                return configuredPath;
            }

            var defaultPath = "/app/db/wood/v0.39/01_add_production_labor_tracking.sql";
            if (File.Exists(defaultPath))
            {
                return defaultPath;
            }

            var currentDir = AppDomain.CurrentDomain.BaseDirectory;
            while (currentDir != null)
            {
                var path1 = Path.Combine(currentDir, "db", "wood", "v0.39", "01_add_production_labor_tracking.sql");
                if (File.Exists(path1)) return path1;

                var path2 = Path.Combine(currentDir, "wood-app.api", "db", "wood", "v0.39", "01_add_production_labor_tracking.sql");
                if (File.Exists(path2)) return path2;

                currentDir = Directory.GetParent(currentDir)?.FullName;
            }

            return null;
        }

        private string? ResolveBaseProductionScriptPath()
        {
            var configuredPath = _config["BaseProductionMigrationScriptPath"];
            if (!string.IsNullOrEmpty(configuredPath) && File.Exists(configuredPath))
            {
                return configuredPath;
            }

            var defaultPath = "/app/db/wood/v0.28/V0.28__add_production_module.sql";
            if (File.Exists(defaultPath))
            {
                return defaultPath;
            }

            var currentDir = AppDomain.CurrentDomain.BaseDirectory;
            while (currentDir != null)
            {
                var path1 = Path.Combine(currentDir, "db", "wood", "v0.28", "V0.28__add_production_module.sql");
                if (File.Exists(path1)) return path1;

                var path2 = Path.Combine(currentDir, "wood-app.api", "db", "wood", "v0.28", "V0.28__add_production_module.sql");
                if (File.Exists(path2)) return path2;

                currentDir = Directory.GetParent(currentDir)?.FullName;
            }

            return null;
        }
    }
}
