using System.Threading.Tasks;
using ms.admin.api.acya.core.Entities;

namespace ms.admin.api.acya.core.Interfaces
{
    public interface ITenantProvisioningService
    {
        Task<bool> ProvisionTenantAsync(MasterEnterprise enterprise);
    }
}
