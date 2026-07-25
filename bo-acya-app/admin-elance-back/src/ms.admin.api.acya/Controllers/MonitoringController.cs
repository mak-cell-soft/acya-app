using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using ms.admin.api.acya.infrastructure;
using Npgsql;
using System;
using System.Threading.Tasks;

namespace ms.admin.api.acya.Controllers
{
    [ApiController]
    [Route("api/admin/[controller]")]
    [Authorize(Roles = "SUPER_ADMIN")]
    public class MonitoringController : ControllerBase
    {
        private readonly MasterDbContext _context;
        private readonly IConfiguration _configuration;

        public MonitoringController(MasterDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpGet("{tenantId}")]
        public async Task<IActionResult> GetMonitoring(long tenantId)
        {
            var tenant = await _context.Enterprises.FindAsync(tenantId);
            if (tenant == null) return NotFound("Tenant not found.");

            long dbSize = 0;
            int userCount = 0;
            int activeConnections = 0;
            DateTime? lastActivity = null;
            string? errorMessage = null;

            try
            {
                // Use the explicit connection string from configuration to preserve password
                var connStr = _configuration.GetConnectionString("MasterConnection")
                    ?? _context.Database.GetDbConnection().ConnectionString;

                using (var conn = new NpgsqlConnection(connStr))
                {
                    await conn.OpenAsync();

                    // 1. Get database connections (global)
                    try
                    {
                        using (var cmd = new NpgsqlCommand("SELECT count(*) FROM pg_stat_activity", conn))
                        {
                            activeConnections = Convert.ToInt32(await cmd.ExecuteScalarAsync());
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[Monitoring] Failed DB connections count: {ex.Message}");
                    }

                    // Sanitize schema name for safety
                    var safeSchema = tenant.SchemaName.Replace("\"", "").Replace("'", "");

                    // 2. Get tenant schema size
                    try
                    {
                        var sizeSql = @"
                            SELECT COALESCE(sum(pg_total_relation_size(quote_ident(schemaname) || '.' || quote_ident(relname))), 0) 
                            FROM pg_stat_user_tables 
                            WHERE schemaname = @SchemaName;";
                        using (var cmd = new NpgsqlCommand(sizeSql, conn))
                        {
                            cmd.Parameters.AddWithValue("SchemaName", safeSchema);
                            dbSize = Convert.ToInt64(await cmd.ExecuteScalarAsync());
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[Monitoring] Failed schema size calculation: {ex.Message}");
                    }

                    // 3. Get users count in tenant schema
                    try
                    {
                        var usersSql = $"SELECT count(*) FROM \"{safeSchema}\".tbl_app_user;";
                        using (var cmd = new NpgsqlCommand(usersSql, conn))
                        {
                            userCount = Convert.ToInt32(await cmd.ExecuteScalarAsync());
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[Monitoring] Failed user count query: {ex.Message}");
                    }

                    // 4. Get last audit activity timestamp
                    try
                    {
                        var activitySql = $"SELECT max(\"Timestamp\") FROM \"{safeSchema}\".\"AuditLogs\";";
                        using (var cmd = new NpgsqlCommand(activitySql, conn))
                        {
                            var res = await cmd.ExecuteScalarAsync();
                            if (res != null && res != DBNull.Value)
                            {
                                lastActivity = (DateTime)res;
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[Monitoring] Failed audit logs activity query: {ex.Message}");
                    }
                }
            }
            catch (Exception ex)
            {
                errorMessage = ex.Message;
            }

            var isHealthy = string.IsNullOrEmpty(errorMessage);

            return Ok(new
            {
                DatabaseSize = dbSize,
                UserCount = userCount,
                ActiveConnections = activeConnections,
                LastActivity = lastActivity,
                Status = isHealthy ? "Healthy" : "Degraded",
                ErrorMessage = errorMessage
            });
        }
    }
}
