using System.Threading.Tasks;
using ms.admin.api.acya.core.Entities;
using ms.admin.api.acya.core.DTOs;

namespace ms.admin.api.acya.core.Interfaces
{
    public interface ITenantProvisioningService
    {
        Task<bool> ProvisionTenantAsync(MasterEnterprise enterprise, string adminUsername, string adminEmail, string adminPassword);
        Task<bool> ProvisionTenantAsync(MasterEnterprise enterprise, TenantProvisionDetails details);
        Task<bool> DeprovisionTenantAsync(MasterEnterprise enterprise);
    }
}
