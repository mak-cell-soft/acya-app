using ms.admin.api.acya.core.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace ms.admin.api.acya.core.Interfaces
{
    public interface IEnterpriseRepository
    {
        Task<MasterEnterprise?> GetByIdAsync(long id);
        Task<MasterEnterprise?> GetBySlugAsync(string slug);
        Task<IEnumerable<MasterEnterprise>> GetAllAsync();
        Task<MasterEnterprise> AddAsync(MasterEnterprise enterprise);
        Task UpdateAsync(MasterEnterprise enterprise);
        Task DeleteAsync(MasterEnterprise enterprise);
    }
}
