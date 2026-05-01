using ms.webapp.api.acya.core.Entities.DTOs;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace ms.webapp.api.acya.api.Interfaces
{
    public interface IPricingGridService
    {
        Task<IEnumerable<PricingGridDto>> GetForCounterPartAsync(int counterPartId);
        Task<IEnumerable<PricingGridLookupDto>> GetLookupAsync(int counterPartId);
        Task<PricingGridDto> CreateAsync(PricingGridDto dto);
        Task<PricingGridDto?> UpdateAsync(int id, PricingGridDto dto);
        Task<bool> DeleteAsync(int id);
    }
}
