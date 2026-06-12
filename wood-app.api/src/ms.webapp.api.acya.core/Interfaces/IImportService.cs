using ms.webapp.api.acya.core.Entities.DTOs;
using System.IO;
using System.Threading.Tasks;

namespace ms.webapp.api.acya.core.Interfaces
{
    public interface IImportService
    {
        Task<ImportReportDto> ImportArticlesAsync(Stream fileStream, string fileName, int userId, int enterpriseId);
        Task<ImportReportDto> ImportCounterPartsAsync(Stream fileStream, string fileName, string type, int userId, int enterpriseId);
        Task<ImportReportDto> ImportSettingsAsync(Stream fileStream, string fileName);
    }
}
