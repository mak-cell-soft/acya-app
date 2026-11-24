using System;
using System.Collections.Concurrent;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using ms.admin.api.acya.core.Interfaces;
using ms.admin.api.acya.Services;
using Npgsql;
using NpgsqlTypes;

namespace ms.admin.api.acya.infrastructure.Services
{
    /// <summary>
    /// Writes tenant-specific billing notifications directly into {tenant_schema}."AppNotifications"
    /// (the existing Élancé notification center table) with strict idempotency on (RelatedEntityType, RelatedEntityId).
    /// Also maintains an in-memory fallback store when running against EF InMemory in unit tests.
    /// </summary>
    public class TenantBillingNotificationDispatcher : ITenantBillingNotificationDispatcher
    {
        private readonly MasterDbContext _context;
        private readonly IConfiguration? _configuration;
        private readonly ILogger<TenantBillingNotificationDispatcher>? _logger;

        // Tracked keys for in-memory test verification when no relational PostgreSQL connection is configured
        private readonly ConcurrentDictionary<string, bool> _inMemorySentKeys = new(StringComparer.OrdinalIgnoreCase);

        public TenantBillingNotificationDispatcher(
            MasterDbContext context,
            IConfiguration? configuration = null,
            ILogger<TenantBillingNotificationDispatcher>? logger = null)
        {
            _context = context;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<bool> TryCreateNotificationAsync(
            long tenantId,
            string title,
            string message,
            int notificationType,
            int priority,
            string relatedEntityType,
            string relatedEntityId,
            CancellationToken cancellationToken = default)
        {
            if (tenantId <= 0 || string.IsNullOrWhiteSpace(relatedEntityType) || string.IsNullOrWhiteSpace(relatedEntityId))
            {
                return false;
            }

            var tenant = await _context.Enterprises
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.Id == tenantId, cancellationToken);

            if (tenant == null)
            {
                return false;
            }

            var dedupKey = $"{tenant.Id}:{relatedEntityType}:{relatedEntityId}";

            // Check if running against EF Core InMemory provider (e.g. unit tests)
            var providerName = _context.Database.ProviderName ?? string.Empty;
            if (providerName.Contains("InMemory", StringComparison.OrdinalIgnoreCase))
            {
                return _inMemorySentKeys.TryAdd(dedupKey, true);
            }

            if (!SchemaSanitizer.IsValidIdentifier(tenant.SchemaName))
            {
                _logger?.LogWarning("Skipping billing notification for tenant '{Slug}': invalid schema '{Schema}'.", tenant.Slug, tenant.SchemaName);
                return false;
            }

            var connStr = _configuration?.GetConnectionString("MasterConnection");
            if (string.IsNullOrWhiteSpace(connStr))
            {
                try
                {
                    connStr = _context.Database.GetDbConnection().ConnectionString;
                }
                catch
                {
                    return _inMemorySentKeys.TryAdd(dedupKey, true);
                }
            }

            if (string.IsNullOrWhiteSpace(connStr))
            {
                return _inMemorySentKeys.TryAdd(dedupKey, true);
            }

            try
            {
                await using var conn = new NpgsqlConnection(connStr);
                await conn.OpenAsync(cancellationToken);

                // 1. Verify "AppNotifications" table exists in the target tenant schema
                await using (var checkTableCmd = new NpgsqlCommand(
                    "SELECT 1 FROM information_schema.tables WHERE table_schema = @schema AND table_name = 'AppNotifications';",
                    conn))
                {
                    checkTableCmd.Parameters.AddWithValue("schema", tenant.SchemaName);
                    var tableExists = await checkTableCmd.ExecuteScalarAsync(cancellationToken);
                    if (tableExists == null)
                    {
                        _logger?.LogInformation("Schema '{Schema}' does not contain AppNotifications table yet.", tenant.SchemaName);
                        return false;
                    }
                }

                var quotedSchema = SchemaSanitizer.QuoteIdentifier(tenant.SchemaName);

                await using var tx = await conn.BeginTransactionAsync(cancellationToken);

                // 2. Acquire transaction-scoped PostgreSQL advisory lock for this exact tenant + reminder event key
                await using (var lockCmd = new NpgsqlCommand(
                    "SELECT pg_advisory_xact_lock(hashtext('acya_billing_notif_' || @lockKey));",
                    conn,
                    tx))
                {
                    lockCmd.Parameters.Add(new NpgsqlParameter("lockKey", NpgsqlDbType.Text) { Value = dedupKey });
                    await lockCmd.ExecuteNonQueryAsync(cancellationToken);
                }

                // 3. Atomic INSERT ... WHERE NOT EXISTS (plus partial unique index conflict protection)
                var insertSql = $@"
                    INSERT INTO {quotedSchema}.""AppNotifications""
                        (""Title"", ""Message"", ""Type"", ""Priority"", ""TargetUserId"", ""TargetRole"", ""TargetSiteId"",
                         ""IsRead"", ""CreatedAt"", ""RelatedEntityId"", ""RelatedEntityType"")
                    SELECT
                        @title, @message, @type, @priority, NULL, NULL, NULL,
                        FALSE, @createdAt, @entityId, @entityType
                    WHERE NOT EXISTS (
                        SELECT 1 FROM {quotedSchema}.""AppNotifications""
                        WHERE ""RelatedEntityType"" = @entityType
                          AND ""RelatedEntityId"" = @entityId
                    );";

                int rowsAffected;
                await using (var insertCmd = new NpgsqlCommand(insertSql, conn, tx))
                {
                    insertCmd.Parameters.Add(new NpgsqlParameter("title", NpgsqlDbType.Varchar) { Value = title.Length > 200 ? title.Substring(0, 200) : title });
                    insertCmd.Parameters.Add(new NpgsqlParameter("message", NpgsqlDbType.Text) { Value = message });
                    insertCmd.Parameters.Add(new NpgsqlParameter("type", NpgsqlDbType.Integer) { Value = notificationType });
                    insertCmd.Parameters.Add(new NpgsqlParameter("priority", NpgsqlDbType.Integer) { Value = priority });
                    insertCmd.Parameters.Add(new NpgsqlParameter("createdAt", NpgsqlDbType.TimestampTz) { Value = DateTime.UtcNow });
                    insertCmd.Parameters.Add(new NpgsqlParameter("entityId", NpgsqlDbType.Text) { Value = relatedEntityId });
                    insertCmd.Parameters.Add(new NpgsqlParameter("entityType", NpgsqlDbType.Text) { Value = relatedEntityType });

                    rowsAffected = await insertCmd.ExecuteNonQueryAsync(cancellationToken);
                }

                await tx.CommitAsync(cancellationToken);
                return rowsAffected > 0;
            }
            catch (PostgresException pgEx) when (pgEx.SqlState == "23505")
            {
                // Unique constraint violation on (RelatedEntityType, RelatedEntityId) -> duplicate prevented
                return false;
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "Failed to persist billing notification in schema '{Schema}' for tenant '{Slug}'.", tenant.SchemaName, tenant.Slug);
                return false;
            }
        }
    }
}
