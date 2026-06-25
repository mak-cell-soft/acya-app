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
            _logger.LogInformation("Starting pg_dump for schema {Schema} to {Path}", schemaName, targetFilePath);

            var dir = Path.GetDirectoryName(targetFilePath);
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
                Arguments = $"-h {host} -p {port} -U {username} -d {database} -n {schemaName} -F c -b -v -f \"{targetFilePath}\"",
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
                    throw new Exception($"pg_dump failed with exit code {process.ExitCode}. Error: {error}");
                }
            }

            _logger.LogInformation("pg_dump successfully completed for schema {Schema}", schemaName);
        }

        public async Task RestoreTenantSchemaAsync(string schemaName, string sourceFilePath)
        {
            _logger.LogInformation("Starting pg_restore for schema {Schema} from {Path}", schemaName, sourceFilePath);

            if (!File.Exists(sourceFilePath))
            {
                throw new FileNotFoundException("Backup file not found.", sourceFilePath);
            }

            var builder = new NpgsqlConnectionStringBuilder(_connectionString);
            var host = builder.Host;
            var port = builder.Port;
            var username = builder.Username;
            var password = builder.Password;
            var database = builder.Database;

            // 1. Drop existing schema to prevent conflicts, then recreate it empty
            using (var conn = new NpgsqlConnection(_connectionString))
            {
                await conn.OpenAsync();
                using (var cmd = new NpgsqlCommand($"DROP SCHEMA IF EXISTS {schemaName} CASCADE; CREATE SCHEMA {schemaName};", conn))
                {
                    await cmd.ExecuteNonQueryAsync();
                }
            }

            // 2. Restore using pg_restore
            var startInfo = new ProcessStartInfo
            {
                FileName = "pg_restore",
                Arguments = $"-h {host} -p {port} -U {username} -d {database} -v \"{sourceFilePath}\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };
            startInfo.EnvironmentVariables["PGPASSWORD"] = password;

            using (var process = Process.Start(startInfo))
            {
                if (process == null) throw new Exception("Failed to start pg_restore process.");
                string error = await process.StandardError.ReadToEndAsync();
                await process.WaitForExitAsync();

                if (process.ExitCode != 0)
                {
                    _logger.LogError("pg_restore failed with exit code {Code}. Error: {Err}", process.ExitCode, error);
                    throw new Exception($"pg_restore failed with exit code {process.ExitCode}. Error: {error}");
                }
            }

            _logger.LogInformation("pg_restore successfully completed for schema {Schema}", schemaName);
        }
    }
}
