using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using ms.admin.api.acya.infrastructure;
using Npgsql;
using System;
using System.Diagnostics;
using System.IO;
using System.Threading.Tasks;

namespace ms.admin.api.acya.Services
{
    public class BackupService
    {
        private readonly MasterDbContext _context;
        private readonly ILogger<BackupService> _logger;
        private readonly string _connectionString;

        public BackupService(MasterDbContext context, IConfiguration configuration, ILogger<BackupService> logger)
        {
            _context = context;
            _logger = logger;
            _connectionString = configuration.GetConnectionString("MasterConnection") 
                ?? throw new InvalidOperationException("MasterConnection string is missing.");
        }

        public async Task BackupTenantSchemaAsync(string schemaName, string targetFilePath)
        {
            if (!SchemaSanitizer.IsValidIdentifier(schemaName))
            {
                throw new ArgumentException($"Invalid schema name: '{schemaName}'", nameof(schemaName));
            }

            var fullPath = Path.GetFullPath(targetFilePath);
            var backupsDir = Path.GetFullPath("/app/backups");
            if (!fullPath.StartsWith(backupsDir, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException("Invalid target file path outside backups directory.");
            }

            _logger.LogInformation("Starting pg_dump for schema {Schema} to {Path}", schemaName, fullPath);

            var dir = Path.GetDirectoryName(fullPath);
            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }

            var builder = new NpgsqlConnectionStringBuilder(_connectionString);
            var host = builder.Host;
            var port = builder.Port;
            var username = builder.Username;
            var password = builder.Password;
            var database = builder.Database;

            var startInfo = new ProcessStartInfo
            {
                FileName = "pg_dump",
                Arguments = $"-h {host} -p {port} -U {username} -d {database} -n \"{schemaName}\" -F c -b -v -f \"{fullPath}\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };
            startInfo.EnvironmentVariables["PGPASSWORD"] = password;

            using (var process = Process.Start(startInfo))
            {
                if (process == null) throw new Exception("Failed to start pg_dump process.");
                string error = await process.StandardError.ReadToEndAsync();
                await process.WaitForExitAsync();

                if (process.ExitCode != 0)
                {
                    _logger.LogError("pg_dump failed with exit code {Code}. Error: {Err}", process.ExitCode, error);
                    throw new Exception($"pg_dump failed with exit code {process.ExitCode}.");
                }
            }

            _logger.LogInformation("pg_dump successfully completed for schema {Schema}", schemaName);
        }

        public Task RestoreTenantSchemaAsync(string schemaName, string sourceFilePath)
        {
            _logger.LogWarning(
                "Blocked retired legacy restore invocation for schema '{Schema}' and source '{SourcePath}'. Legacy in-place DROP SCHEMA CASCADE restoration is disabled.",
                schemaName,
                sourceFilePath);

            throw new NotSupportedException(
                "The legacy in-place schema restore mechanism has been retired for production safety and cannot execute database modifications.");
        }
    }
}
