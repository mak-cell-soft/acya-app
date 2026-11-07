using ms.admin.api.acya.core.DTOs;
using System.Threading;
using System.Threading.Tasks;

namespace ms.admin.api.acya.core.Interfaces
{
    public interface IBackupSchedulerManagementService
    {
        Task<SchedulerStatusDto> GetSchedulerStatusAsync(CancellationToken cancellationToken = default);

        Task<SchedulerStatusDto> UpdateDailyScheduleAsync(
            string time,
            string timezone,
            string performedBy,
            string? ipAddress = null,
            CancellationToken cancellationToken = default);

        Task<SchedulerStatusDto> EnableSchedulerAsync(
            string performedBy,
            string? ipAddress = null,
            CancellationToken cancellationToken = default);

        Task<SchedulerStatusDto> DisableSchedulerAsync(
            string performedBy,
            string? ipAddress = null,
            CancellationToken cancellationToken = default);
    }

    public interface IProductionSchedulerBridge
    {
        string TransportName { get; }
        string ProductionHost { get; }

        Task<string> ExecuteCommandAsync(
            string subcommand,
            string[] args,
            CancellationToken cancellationToken = default);
    }
}

