using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using ms.admin.api.acya.common;
using ms.admin.api.acya.core.DTOs;
using ms.admin.api.acya.core.Entities;
using ms.admin.api.acya.core.Interfaces;
using ms.admin.api.acya.infrastructure;
using System;
using System.Diagnostics;
using System.IO;
using System.Net.Http;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

namespace ms.admin.api.acya.Services
{
    public sealed class SchedulerManagementException : Exception
    {
        public string Code { get; }
        public int StatusCode { get; }

        public SchedulerManagementException(string code, string message, int statusCode = 400)
            : base(message)
        {
            Code = code;
            StatusCode = statusCode;
        }
    }

    public sealed class HostCliProductionSchedulerBridge : IProductionSchedulerBridge
    {
        private readonly string _cliPath;
        private readonly ILogger<HostCliProductionSchedulerBridge> _logger;

        public string TransportName => "host_cli";
        public string ProductionHost => "51.210.10.108";

        public HostCliProductionSchedulerBridge(
            ILogger<HostCliProductionSchedulerBridge> logger,
            string cliPath = "/opt/acya-backup/bin/acya-backup-scheduler")
        {
            _logger = logger;
            _cliPath = cliPath;
        }

        public async Task<string> ExecuteCommandAsync(
            string subcommand,
            string[] args,
            CancellationToken cancellationToken = default)
        {
            if (!File.Exists(_cliPath))
            {
                throw new SchedulerManagementException(
                    "scheduler_cli_not_found",
                    $"Host scheduler CLI binary was not found at '{_cliPath}'.",
                    503);
            }

            var startInfo = new ProcessStartInfo
            {
                FileName = _cliPath,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            startInfo.ArgumentList.Add(subcommand);
            foreach (var a in args)
            {
                startInfo.ArgumentList.Add(a);
            }

            using var process = new Process { StartInfo = startInfo };
            try
            {
                process.Start();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to start scheduler CLI process: {Path}", _cliPath);
                throw new SchedulerManagementException("cli_spawn_failed", $"Failed to invoke scheduler CLI: {ex.Message}", 500);
            }

            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(15));

            var stdoutTask = process.StandardOutput.ReadToEndAsync();
            var stderrTask = process.StandardError.ReadToEndAsync();

            try
            {
                await process.WaitForExitAsync(timeoutCts.Token);
            }
            catch (OperationCanceledException)
            {
                try { process.Kill(entireProcessTree: true); } catch { }
                throw new SchedulerManagementException("scheduler_cli_timeout", "Host scheduler CLI command timed out after 15 seconds.", 504);
            }

            var stdout = (await stdoutTask).Trim();
            var stderr = (await stderrTask).Trim();

            if (process.ExitCode != 0)
            {
                string errMsg = stderr;
                string errCode = "scheduler_cli_error";
                try
                {
                    using var doc = JsonDocument.Parse(stderr);
                    if (doc.RootElement.TryGetProperty("message", out var m)) errMsg = m.GetString() ?? stderr;
                    if (doc.RootElement.TryGetProperty("code", out var c)) errCode = c.GetString() ?? errCode;
                }
                catch { }

                _logger.LogWarning("Scheduler CLI returned exit code {Code}: {Err}", process.ExitCode, errMsg);
                throw new SchedulerManagementException(errCode, errMsg, process.ExitCode == 1 ? 422 : 500);
            }

            return stdout;
        }
    }

    public sealed class HttpProductionSchedulerBridge : IProductionSchedulerBridge
    {
        private readonly HttpClient _httpClient;
        private readonly string _endpointUrl;
        private readonly string _secret;
        private readonly ILogger<HttpProductionSchedulerBridge> _logger;

        public string TransportName => "remote_http";
        public string ProductionHost { get; }

        public HttpProductionSchedulerBridge(
            HttpClient httpClient,
            string endpointUrl,
            string secret,
            ILogger<HttpProductionSchedulerBridge> logger,
            string productionHost = "51.210.10.108")
        {
            _httpClient = httpClient;
            _endpointUrl = endpointUrl.TrimEnd('/');
            _secret = secret;
            _logger = logger;
            ProductionHost = productionHost;
        }

        public async Task<string> ExecuteCommandAsync(
            string subcommand,
            string[] args,
            CancellationToken cancellationToken = default)
        {
            string url;
            HttpMethod method;
            object? payload = null;

            switch (subcommand)
            {
                case "status":
                    url = $"{_endpointUrl}/status";
                    method = HttpMethod.Get;
                    break;
                case "set-schedule":
                    url = $"{_endpointUrl}/schedule";
                    method = HttpMethod.Post;
                    string time = "";
                    string tz = "";
                    string user = "SuperAdmin";
                    for (int i = 0; i < args.Length; i++)
                    {
                        if (args[i] == "--time" && i + 1 < args.Length) time = args[i + 1];
                        if (args[i] == "--timezone" && i + 1 < args.Length) tz = args[i + 1];
                        if (args[i] == "--user" && i + 1 < args.Length) user = args[i + 1];
                    }
                    payload = new { time, timezone = tz, user };
                    break;
                case "enable":
                    url = $"{_endpointUrl}/enable";
                    method = HttpMethod.Post;
                    string enUser = "SuperAdmin";
                    for (int i = 0; i < args.Length; i++)
                    {
                        if (args[i] == "--user" && i + 1 < args.Length) enUser = args[i + 1];
                    }
                    payload = new { user = enUser };
                    break;
                case "disable":
                    url = $"{_endpointUrl}/disable";
                    method = HttpMethod.Post;
                    string disUser = "SuperAdmin";
                    for (int i = 0; i < args.Length; i++)
                    {
                        if (args[i] == "--user" && i + 1 < args.Length) disUser = args[i + 1];
                    }
                    payload = new { user = disUser };
                    break;
                default:
                    throw new SchedulerManagementException("unknown_subcommand", $"Unknown subcommand: {subcommand}", 400);
            }

            using var req = new HttpRequestMessage(method, url);
            req.Headers.Add("X-Scheduler-Token", _secret);
            if (payload != null)
            {
                req.Content = new StringContent(JsonSerializer.Serialize(payload), System.Text.Encoding.UTF8, "application/json");
            }

            try
            {
                using var res = await _httpClient.SendAsync(req, cancellationToken);
                var content = await res.Content.ReadAsStringAsync(cancellationToken);

                if (!res.IsSuccessStatusCode)
                {
                    string errMsg = content;
                    string errCode = "http_error";
                    try
                    {
                        using var doc = JsonDocument.Parse(content);
                        if (doc.RootElement.TryGetProperty("message", out var m)) errMsg = m.GetString() ?? content;
                        if (doc.RootElement.TryGetProperty("code", out var c)) errCode = c.GetString() ?? errCode;
                    }
                    catch { }

                    _logger.LogWarning("Scheduler daemon HTTP error {Code}: {Err}", (int)res.StatusCode, errMsg);
                    throw new SchedulerManagementException(errCode, errMsg, (int)res.StatusCode);
                }

                return content;
            }
            catch (SchedulerManagementException)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to connect to scheduler daemon at {Url}", url);
                throw new SchedulerManagementException("connection_failed", $"Failed to connect to Production VPS scheduler daemon: {ex.Message}", 503);
            }
        }
    }

    public sealed class BackupSchedulerManagementService : IBackupSchedulerManagementService
    {
        private readonly MasterDbContext _dbContext;
        private readonly IProductionSchedulerBridge _bridge;
        private readonly ILogger<BackupSchedulerManagementService> _logger;
        private readonly SemaphoreSlim _concurrencyGate = new(1, 1);

        public BackupSchedulerManagementService(
            MasterDbContext dbContext,
            IProductionSchedulerBridge bridge,
            ILogger<BackupSchedulerManagementService> logger)
        {
            _dbContext = dbContext;
            _bridge = bridge;
            _logger = logger;
        }

        public async Task<SchedulerStatusDto> GetSchedulerStatusAsync(CancellationToken cancellationToken = default)
        {
            try
            {
                var json = await _bridge.ExecuteCommandAsync("status", Array.Empty<string>(), cancellationToken);
                var dto = ParseSchedulerStatus(json);
                dto.Communication.Transport = _bridge.TransportName;
                dto.Communication.ProductionHost = _bridge.ProductionHost;
                dto.Communication.Status = "connected";
                return dto;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to query scheduler status from production bridge");
                var fallback = BuildFallbackStatus(ex);
                return fallback;
            }
        }

        public async Task<SchedulerStatusDto> UpdateDailyScheduleAsync(
            string time,
            string timezone,
            string performedBy,
            string? ipAddress = null,
            CancellationToken cancellationToken = default)
        {
            var (isValid, errorMsg, tz) = BackupScheduleCalculator.Validate(true, "daily", time, timezone);
            if (!isValid || tz == null)
            {
                throw new SchedulerManagementException("invalid_schedule", errorMsg ?? "Invalid daily schedule parameters.", 400);
            }

            if (!await _concurrencyGate.WaitAsync(TimeSpan.FromSeconds(5), cancellationToken))
            {
                throw new SchedulerManagementException("concurrent_operation", "Another scheduler management operation is in progress.", 409);
            }

            try
            {
                var args = new[]
                {
                    "--time", time.Trim(),
                    "--timezone", tz.Id,
                    "--user", string.IsNullOrWhiteSpace(performedBy) ? "SuperAdmin" : performedBy.Trim()
                };

                var json = await _bridge.ExecuteCommandAsync("set-schedule", args, cancellationToken);
                var dto = ParseSchedulerStatus(json);

                // Update platform settings
                await UpsertSettingAsync("Backup_ScheduleTime", time.Trim(), cancellationToken);
                await UpsertSettingAsync("Backup_Timezone", tz.Id, cancellationToken);
                await _dbContext.SaveChangesAsync(cancellationToken);

                // Audit log
                await RecordAuditLogAsync(
                    "BACKUP_SCHEDULER_UPDATE",
                    performedBy,
                    ipAddress,
                    new { time = time.Trim(), timezone = tz.Id, calculatedSummary = dto.Schedule.Summary },
                    cancellationToken);

                _logger.LogInformation("Daily backup schedule updated to {Time} {Timezone} by {User}", time, tz.Id, performedBy);
                return dto;
            }
            finally
            {
                _concurrencyGate.Release();
            }
        }

        public async Task<SchedulerStatusDto> EnableSchedulerAsync(
            string performedBy,
            string? ipAddress = null,
            CancellationToken cancellationToken = default)
        {
            if (!await _concurrencyGate.WaitAsync(TimeSpan.FromSeconds(5), cancellationToken))
            {
                throw new SchedulerManagementException("concurrent_operation", "Another scheduler management operation is in progress.", 409);
            }

            try
            {
                var args = new[]
                {
                    "--user", string.IsNullOrWhiteSpace(performedBy) ? "SuperAdmin" : performedBy.Trim()
                };

                var json = await _bridge.ExecuteCommandAsync("enable", args, cancellationToken);
                var dto = ParseSchedulerStatus(json);

                await UpsertSettingAsync("Backup_AutoEnabled", "true", cancellationToken);
                await _dbContext.SaveChangesAsync(cancellationToken);

                await RecordAuditLogAsync(
                    "BACKUP_SCHEDULER_ENABLE",
                    performedBy,
                    ipAddress,
                    new { state = dto.State, timerUnit = dto.TimerUnit },
                    cancellationToken);

                _logger.LogInformation("Backup scheduler enabled by {User}", performedBy);
                return dto;
            }
            finally
            {
                _concurrencyGate.Release();
            }
        }

        public async Task<SchedulerStatusDto> DisableSchedulerAsync(
            string performedBy,
            string? ipAddress = null,
            CancellationToken cancellationToken = default)
        {
            if (!await _concurrencyGate.WaitAsync(TimeSpan.FromSeconds(5), cancellationToken))
            {
                throw new SchedulerManagementException("concurrent_operation", "Another scheduler management operation is in progress.", 409);
            }

            try
            {
                var args = new[]
                {
                    "--user", string.IsNullOrWhiteSpace(performedBy) ? "SuperAdmin" : performedBy.Trim()
                };

                var json = await _bridge.ExecuteCommandAsync("disable", args, cancellationToken);
                var dto = ParseSchedulerStatus(json);

                await UpsertSettingAsync("Backup_AutoEnabled", "false", cancellationToken);
                await _dbContext.SaveChangesAsync(cancellationToken);

                await RecordAuditLogAsync(
                    "BACKUP_SCHEDULER_DISABLE",
                    performedBy,
                    ipAddress,
                    new { state = dto.State, timerUnit = dto.TimerUnit },
                    cancellationToken);

                _logger.LogInformation("Backup scheduler disabled by {User}", performedBy);
                return dto;
            }
            finally
            {
                _concurrencyGate.Release();
            }
        }

        private SchedulerStatusDto ParseSchedulerStatus(string json)
        {
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var dto = JsonSerializer.Deserialize<SchedulerStatusDto>(json, options);
            if (dto == null)
            {
                throw new SchedulerManagementException("parse_failed", "Failed to deserialize scheduler status payload.", 500);
            }
            dto.Communication.Transport = _bridge.TransportName;
            dto.Communication.ProductionHost = _bridge.ProductionHost;
            dto.Communication.Status = "connected";
            return dto;
        }

        private SchedulerStatusDto BuildFallbackStatus(Exception ex)
        {
            return new SchedulerStatusDto
            {
                Enabled = false,
                Active = false,
                State = "communication_error",
                Schedule = new SchedulerScheduleInfoDto
                {
                    Time = "02:00",
                    Timezone = "UTC",
                    Summary = "Communication with Production VPS scheduler unavailable."
                },
                Safety = new SchedulerSafetyInfoDto
                {
                    RepositoryWritesAuthorized = false,
                    BackupExecutionPermitted = false,
                    SafetyNotice = "Could not reach Production VPS scheduler controller."
                },
                Communication = new SchedulerCommunicationInfoDto
                {
                    Transport = _bridge.TransportName,
                    ProductionHost = _bridge.ProductionHost,
                    Status = "error",
                    ErrorMessage = ex.Message
                }
            };
        }

        private async Task UpsertSettingAsync(string key, string value, CancellationToken cancellationToken)
        {
            var setting = await _dbContext.PlatformSettings.FirstOrDefaultAsync(s => s.Key == key, cancellationToken);
            if (setting == null)
            {
                _dbContext.PlatformSettings.Add(new PlatformSetting
                {
                    Key = key,
                    Value = value,
                    UpdatedAt = DateTime.UtcNow
                });
            }
            else
            {
                setting.Value = value;
                setting.UpdatedAt = DateTime.UtcNow;
            }
        }

        private async Task RecordAuditLogAsync(
            string action,
            string performedBy,
            string? ipAddress,
            object details,
            CancellationToken cancellationToken)
        {
            try
            {
                var audit = new MasterAuditLog
                {
                    TenantId = null,
                    Action = action,
                    Details = JsonSerializer.Serialize(new
                    {
                        details,
                        ipAddress = ipAddress ?? "unknown"
                    }),
                    PerformedBy = string.IsNullOrWhiteSpace(performedBy) ? "SuperAdmin" : performedBy,
                    Timestamp = DateTime.UtcNow
                };

                _dbContext.MasterAuditLogs.Add(audit);
                await _dbContext.SaveChangesAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to record audit log for action {Action}", action);
            }
        }
    }
}

