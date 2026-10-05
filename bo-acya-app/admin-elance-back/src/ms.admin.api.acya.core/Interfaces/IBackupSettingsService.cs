using ms.admin.api.acya.core.DTOs;
using System.Threading.Tasks;

namespace ms.admin.api.acya.core.Interfaces
{
    public interface IBackupSettingsService
    {
        Task<BackupSettingsResponseDto> GetSettingsAsync();
        
        Task<(bool Success, string? Error, BackupSettingsResponseDto? Result)> UpdateSettingsAsync(
            UpdateBackupSettingsDto dto, string performedBy, string? ipAddress);
    }
}
