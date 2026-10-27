using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using ms.admin.api.acya.core.DTOs;
using ms.admin.api.acya.core.Entities;
using ms.admin.api.acya.core.Interfaces;
using ms.admin.api.acya.Services;
using Npgsql;
using NpgsqlTypes;
using System;
using System.Collections.Generic;
using System.Data.Common;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace ms.admin.api.acya.infrastructure.Services
{
    public class SupportTicketAdminService : ISupportTicketAdminService
    {
        private readonly MasterDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ILogger<SupportTicketAdminService> _logger;

        public SupportTicketAdminService(
            MasterDbContext context,
            IConfiguration configuration,
            ILogger<SupportTicketAdminService> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        private string GetConnectionString()
        {
            return _configuration.GetConnectionString("MasterConnection")
                ?? _context.Database.GetDbConnection().ConnectionString;
        }

        public async Task<SupportTicketPagedResultDto> GetTicketsAsync(
            SupportTicketFilterDto filter,
            CancellationToken cancellationToken = default)
        {
            filter ??= new SupportTicketFilterDto();
            var page = filter.Page < 1 ? 1 : filter.Page;
            var pageSize = (filter.PageSize < 1 || filter.PageSize > 100) ? 20 : filter.PageSize;
            var offset = (page - 1) * pageSize;

            // 1. Discover matching enterprises from master registry
            var enterpriseQuery = _context.Enterprises.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(filter.TenantSlug))
            {
                var normalizedSlug = filter.TenantSlug.Trim().ToLowerInvariant();
                enterpriseQuery = enterpriseQuery.Where(e => e.Slug.ToLower() == normalizedSlug);
            }
            else if (filter.TenantId.HasValue)
            {
                enterpriseQuery = enterpriseQuery.Where(e => e.Id == filter.TenantId.Value);
            }

            var enterprises = await enterpriseQuery
                .Select(e => new { e.Id, e.Slug, e.Name, e.SchemaName })
                .ToListAsync(cancellationToken);

            if (!enterprises.Any())
            {
                return new SupportTicketPagedResultDto
                {
                    TotalCount = 0,
                    Page = page,
                    PageSize = pageSize,
                    TotalPages = 0,
                    Items = new List<SupportTicketListItemDto>()
                };
            }

            // 2. Validate tenant schema names using SchemaSanitizer
            var validTenants = enterprises
                .Where(e => SchemaSanitizer.IsValidIdentifier(e.SchemaName))
                .ToList();

            if (!validTenants.Any())
            {
                _logger.LogWarning("No enterprises had valid schema identifiers among matching tenants.");
                return new SupportTicketPagedResultDto
                {
                    TotalCount = 0,
                    Page = page,
                    PageSize = pageSize,
                    TotalPages = 0,
                    Items = new List<SupportTicketListItemDto>()
                };
            }

            var connStr = GetConnectionString();
            await using var conn = new NpgsqlConnection(connStr);
            await conn.OpenAsync(cancellationToken);

            // 3. Check which schemas actually contain tbl_support_tickets
            var candidateSchemas = validTenants.Select(t => t.SchemaName).Distinct().ToArray();
            var existingSchemas = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            await using (var checkCmd = new NpgsqlCommand(
                "SELECT table_schema FROM information_schema.tables WHERE table_name = 'tbl_support_tickets' AND table_schema = ANY(@schemas);", conn))
            {
                checkCmd.Parameters.AddWithValue("schemas", candidateSchemas);
                await using var reader = await checkCmd.ExecuteReaderAsync(cancellationToken);
                while (await reader.ReadAsync(cancellationToken))
                {
                    existingSchemas.Add(reader.GetString(0));
                }
            }

            validTenants = validTenants.Where(t => existingSchemas.Contains(t.SchemaName)).ToList();
            if (!validTenants.Any())
            {
                return new SupportTicketPagedResultDto
                {
                    TotalCount = 0,
                    Page = page,
                    PageSize = pageSize,
                    TotalPages = 0,
                    Items = new List<SupportTicketListItemDto>()
                };
            }

            var tenantNameBySlug = enterprises
                .GroupBy(e => e.Slug, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => g.First().Name, StringComparer.OrdinalIgnoreCase);

            // 4. Construct union query across validated schemas
            var unionBuilder = new StringBuilder();
            for (int i = 0; i < validTenants.Count; i++)
            {
                if (i > 0) unionBuilder.AppendLine(" UNION ALL ");
                var quotedSchema = SchemaSanitizer.QuoteIdentifier(validTenants[i].SchemaName);
                unionBuilder.Append($@"
                    SELECT ""Id"", ""TicketReference"", ""TenantSlug"", ""EnterpriseName"", ""UserId"", ""UserFullName"", ""UserEmail"",
                           ""Category"", ""Subcategory"", ""Priority"", ""Subject"", ""AttachmentFileName"", ""AttachmentSizeBytes"",
                           ""EmailStatus"", ""CreatedAt"", ""UpdatedAt""
                    FROM {quotedSchema}.tbl_support_tickets");
            }

            var baseUnionSql = unionBuilder.ToString();

            const string whereClause = @"
                WHERE (@priority IS NULL OR LOWER(""Priority"") = LOWER(@priority))
                  AND (@category IS NULL OR LOWER(""Category"") = LOWER(@category))
                  AND (@createdFrom IS NULL OR ""CreatedAt"" >= @createdFrom)
                  AND (@createdTo IS NULL OR ""CreatedAt"" <= @createdTo)
                  AND (@searchPattern IS NULL OR (
                       LOWER(""TicketReference"") LIKE @searchPattern OR
                       LOWER(""Subject"") LIKE @searchPattern OR
                       LOWER(""UserFullName"") LIKE @searchPattern OR
                       LOWER(""UserEmail"") LIKE @searchPattern
                  ))";

            // 5. Query Total Count
            var countSql = $@"
                WITH AllTickets AS (
                    {baseUnionSql}
                )
                SELECT COUNT(*) FROM AllTickets
                {whereClause};";

            int totalCount = 0;
            await using (var countCmd = new NpgsqlCommand(countSql, conn))
            {
                ApplyFilterParameters(countCmd, filter);
                var scalar = await countCmd.ExecuteScalarAsync(cancellationToken);
                totalCount = scalar != null && scalar != DBNull.Value ? Convert.ToInt32(scalar) : 0;
            }

            if (totalCount == 0)
            {
                return new SupportTicketPagedResultDto
                {
                    TotalCount = 0,
                    Page = page,
                    PageSize = pageSize,
                    TotalPages = 0,
                    Items = new List<SupportTicketListItemDto>()
                };
            }

            // 6. Query Paged Items
            var pagedSql = $@"
                WITH AllTickets AS (
                    {baseUnionSql}
                )
                SELECT ""Id"", ""TicketReference"", ""TenantSlug"", ""EnterpriseName"", ""UserId"", ""UserFullName"", ""UserEmail"",
                       ""Category"", ""Subcategory"", ""Priority"", ""Subject"", ""AttachmentFileName"", ""AttachmentSizeBytes"",
                       ""EmailStatus"", ""CreatedAt"", ""UpdatedAt""
                FROM AllTickets
                {whereClause}
                ORDER BY ""CreatedAt"" DESC
                LIMIT @limit OFFSET @offset;";

            var items = new List<SupportTicketListItemDto>();
            await using (var pagedCmd = new NpgsqlCommand(pagedSql, conn))
            {
                ApplyFilterParameters(pagedCmd, filter);
                pagedCmd.Parameters.Add(new NpgsqlParameter("limit", NpgsqlDbType.Integer) { Value = pageSize });
                pagedCmd.Parameters.Add(new NpgsqlParameter("offset", NpgsqlDbType.Integer) { Value = offset });

                await using var reader = await pagedCmd.ExecuteReaderAsync(cancellationToken);
                while (await reader.ReadAsync(cancellationToken))
                {
                    var tenantSlug = reader.IsDBNull(2) ? string.Empty : reader.GetString(2);
                    var attachFileName = reader.IsDBNull(11) ? null : reader.GetString(11);
                    var emailStatus = reader.IsDBNull(13) ? 0 : reader.GetInt32(13);

                    tenantNameBySlug.TryGetValue(tenantSlug, out var tenantDisplayName);

                    items.Add(new SupportTicketListItemDto
                    {
                        Id = reader.GetInt32(0),
                        TicketReference = reader.GetString(1),
                        TenantSlug = tenantSlug,
                        TenantName = !string.IsNullOrWhiteSpace(tenantDisplayName) 
                            ? tenantDisplayName 
                            : (reader.IsDBNull(3) ? tenantSlug : reader.GetString(3)),
                        UserId = reader.GetInt32(4),
                        UserFullName = reader.IsDBNull(5) ? string.Empty : reader.GetString(5),
                        UserEmail = reader.IsDBNull(6) ? string.Empty : reader.GetString(6),
                        Category = reader.IsDBNull(7) ? string.Empty : reader.GetString(7),
                        Subcategory = reader.IsDBNull(8) ? string.Empty : reader.GetString(8),
                        Priority = reader.IsDBNull(9) ? "Normale" : reader.GetString(9),
                        Subject = reader.IsDBNull(10) ? string.Empty : reader.GetString(10),
                        HasAttachment = !string.IsNullOrWhiteSpace(attachFileName),
                        AttachmentFileName = attachFileName,
                        AttachmentSizeBytes = reader.IsDBNull(12) ? null : reader.GetInt64(12),
                        EmailStatus = emailStatus,
                        EmailStatusText = MapEmailStatus(emailStatus),
                        CreatedAt = reader.GetDateTime(14),
                        UpdatedAt = reader.GetDateTime(15)
                    });
                }
            }

            var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

            return new SupportTicketPagedResultDto
            {
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = totalPages,
                Items = items
            };
        }

        public async Task<SupportTicketDetailDto?> GetTicketDetailAsync(
            string tenantSlug,
            int ticketId,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(tenantSlug) || ticketId <= 0)
                return null;

            var normalizedSlug = tenantSlug.Trim().ToLowerInvariant();
            var enterprise = await _context.Enterprises
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.Slug.ToLower() == normalizedSlug, cancellationToken);

            if (enterprise == null)
            {
                _logger.LogInformation("Enterprise with slug '{Slug}' not found.", tenantSlug);
                return null;
            }

            if (!SchemaSanitizer.IsValidIdentifier(enterprise.SchemaName))
            {
                _logger.LogError("Invalid schema identifier '{SchemaName}' configured for tenant '{Slug}'.",
                    enterprise.SchemaName, tenantSlug);
                throw new InvalidOperationException($"Invalid tenant schema configuration for '{tenantSlug}'.");
            }

            var connStr = GetConnectionString();
            await using var conn = new NpgsqlConnection(connStr);
            await conn.OpenAsync(cancellationToken);

            // Verify table exists in schema
            await using (var checkCmd = new NpgsqlCommand(
                "SELECT 1 FROM information_schema.tables WHERE table_schema = @schema AND table_name = 'tbl_support_tickets';", conn))
            {
                checkCmd.Parameters.AddWithValue("schema", enterprise.SchemaName);
                var exists = await checkCmd.ExecuteScalarAsync(cancellationToken);
                if (exists == null)
                {
                    _logger.LogWarning("Schema '{SchemaName}' does not have tbl_support_tickets.", enterprise.SchemaName);
                    return null;
                }
            }

            var quotedSchema = SchemaSanitizer.QuoteIdentifier(enterprise.SchemaName);
            var sql = $@"
                SELECT ""Id"", ""TicketReference"", ""TenantSlug"", ""EnterpriseName"", ""UserId"", ""UserFullName"", ""UserEmail"",
                       ""Category"", ""Subcategory"", ""Priority"", ""Subject"", ""Description"", ""CurrentRoute"", ""AppVersion"",
                       ""ContextData"", ""AttachmentFileName"", ""AttachmentContentType"", ""AttachmentSizeBytes"",
                       ""EmailStatus"", ""EmailError"", ""CreatedAt"", ""UpdatedAt""
                FROM {quotedSchema}.tbl_support_tickets
                WHERE ""Id"" = @ticketId
                LIMIT 1;";

            await using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.Add(new NpgsqlParameter("ticketId", NpgsqlDbType.Integer) { Value = ticketId });

            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
            {
                return null;
            }

            var attachFileName = reader.IsDBNull(15) ? null : reader.GetString(15);
            var emailStatus = reader.IsDBNull(18) ? 0 : reader.GetInt32(18);

            return new SupportTicketDetailDto
            {
                Id = reader.GetInt32(0),
                TicketReference = reader.GetString(1),
                TenantSlug = reader.IsDBNull(2) ? enterprise.Slug : reader.GetString(2),
                TenantName = enterprise.Name,
                EnterpriseName = reader.IsDBNull(3) ? enterprise.Name : reader.GetString(3),
                UserId = reader.GetInt32(4),
                UserFullName = reader.IsDBNull(5) ? string.Empty : reader.GetString(5),
                UserEmail = reader.IsDBNull(6) ? string.Empty : reader.GetString(6),
                Category = reader.IsDBNull(7) ? string.Empty : reader.GetString(7),
                Subcategory = reader.IsDBNull(8) ? string.Empty : reader.GetString(8),
                Priority = reader.IsDBNull(9) ? "Normale" : reader.GetString(9),
                Subject = reader.IsDBNull(10) ? string.Empty : reader.GetString(10),
                Description = reader.IsDBNull(11) ? string.Empty : reader.GetString(11),
                CurrentRoute = reader.IsDBNull(12) ? null : reader.GetString(12),
                AppVersion = reader.IsDBNull(13) ? null : reader.GetString(13),
                ContextData = reader.IsDBNull(14) ? null : reader.GetString(14),
                HasAttachment = !string.IsNullOrWhiteSpace(attachFileName),
                AttachmentFileName = attachFileName,
                AttachmentContentType = reader.IsDBNull(16) ? null : reader.GetString(16),
                AttachmentSizeBytes = reader.IsDBNull(17) ? null : reader.GetInt64(17),
                EmailStatus = emailStatus,
                EmailStatusText = MapEmailStatus(emailStatus),
                EmailError = reader.IsDBNull(19) ? null : reader.GetString(19),
                CreatedAt = reader.GetDateTime(20),
                UpdatedAt = reader.GetDateTime(21)
            };
        }

        private static void ApplyFilterParameters(NpgsqlCommand cmd, SupportTicketFilterDto filter)
        {
            cmd.Parameters.Add(new NpgsqlParameter("priority", NpgsqlDbType.Text)
            {
                Value = string.IsNullOrWhiteSpace(filter.Priority) ? DBNull.Value : filter.Priority.Trim()
            });

            cmd.Parameters.Add(new NpgsqlParameter("category", NpgsqlDbType.Text)
            {
                Value = string.IsNullOrWhiteSpace(filter.Category) ? DBNull.Value : filter.Category.Trim()
            });

            cmd.Parameters.Add(new NpgsqlParameter("createdFrom", NpgsqlDbType.TimestampTz)
            {
                Value = filter.CreatedFrom.HasValue ? filter.CreatedFrom.Value.ToUniversalTime() : DBNull.Value
            });

            cmd.Parameters.Add(new NpgsqlParameter("createdTo", NpgsqlDbType.TimestampTz)
            {
                Value = filter.CreatedTo.HasValue ? filter.CreatedTo.Value.ToUniversalTime() : DBNull.Value
            });

            cmd.Parameters.Add(new NpgsqlParameter("searchPattern", NpgsqlDbType.Text)
            {
                Value = string.IsNullOrWhiteSpace(filter.Search)
                    ? DBNull.Value
                    : $"%{filter.Search.Trim().ToLowerInvariant()}%"
            });
        }

        private static string MapEmailStatus(int status) => status switch
        {
            1 => "Envoyé",
            2 => "Échoué",
            _ => "En attente"
        };
    }
}
