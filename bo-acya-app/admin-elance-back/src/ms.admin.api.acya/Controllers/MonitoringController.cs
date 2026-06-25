using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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

        public MonitoringController(MasterDbContext context)
        {
            _context = context;
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

            try
            {
                var connStr = _context.Database.GetDbConnection().ConnectionString;
                using (var conn = new NpgsqlConnection(connStr))
                {
                    await conn.OpenAsync();

                    // 1. Get database connections (global)
                    using (var cmd = new NpgsqlCommand("SELECT count(*) FROM pg_stat_activity", conn))
                    {
                        activeConnections = Convert.ToInt32(await cmd.ExecuteScalarAsync());
                    }

                    // 2. Get tenant schema size (sum of tables, indexes, toast etc.)
                    var sizeSql = $@"
                        SELECT COALESCE(sum(pg_total_relation_size(quote_ident(schemaname) || '.' || quote_ident(relname))), 0) 
                        FROM pg_stat_user_tables 
                        WHERE schemaname = '{tenant.SchemaName}';";
                    using (var cmd = new NpgsqlCommand(sizeSql, conn))
                    {
                        dbSize = Convert.ToInt64(await cmd.ExecuteScalarAsync());
                    }

                    // 3. Get users count in tenant schema
                    var usersSql = $"SELECT count(*) FROM {tenant.SchemaName}.tbl_app_user;";
                    using (var cmd = new NpgsqlCommand(usersSql, conn))
                    {
                        userCount = Convert.ToInt32(await cmd.ExecuteScalarAsync());
                    }

                    // 4. Get last audit activity timestamp
                    var activitySql = $"SELECT max(\"Timestamp\") FROM {tenant.SchemaName}.\"AuditLogs\";";
                    using (var cmd = new NpgsqlCommand(activitySql, conn))
                    {
                        var res = await cmd.ExecuteScalarAsync();
                        if (res != null && res != DBNull.Value)
                        {
                            lastActivity = (DateTime)res;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                return Ok(new
                {
                    DatabaseSize = 0,
                    UserCount = 0,
                    ActiveConnections = activeConnections,
                    LastActivity = (DateTime?)null,
                    Status = "Degraded",
                    ErrorMessage = ex.Message
                });
            }

            return Ok(new
            {
                DatabaseSize = dbSize,
                UserCount = userCount,
                ActiveConnections = activeConnections,
                LastActivity = lastActivity,
                Status = "Healthy",
                ErrorMessage = (string?)null
            });
        }
    }
}
