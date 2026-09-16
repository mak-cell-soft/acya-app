using System.Collections.Generic;
using System.Threading.Tasks;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs.Production;
using ms.webapp.api.acya.core.Entities.Production;

namespace ms.webapp.api.acya.core.Interfaces
{
  /// <summary>
  /// Data access contract for the Production module.
  /// </summary>
  public interface IProductionRepository
  {
    // Orders
    Task<List<ProductionOrderDto>> GetAllOrdersAsync(ProductionStatus? status = null, int? salesSiteId = null, string? search = null);
    Task<ProductionOrderDto?> GetOrderByIdAsync(int id);
    Task<ProductionOrder?> GetOrderEntityByIdAsync(int id);
    Task<ProductionOrderDto> CreateOrderAsync(CreateProductionOrderDto dto, int userId);
    Task<bool> UpdateOrderAsync(int id, UpdateProductionOrderDto dto, int userId);
    Task<bool> SoftDeleteOrderAsync(int id, int userId);

    // Steps
    Task<ProductionStepDto?> AddStepAsync(int orderId, CreateProductionStepDto dto, int userId);
    Task<bool> UpdateStepAsync(int stepId, UpdateProductionStepDto dto, int userId);
    Task<bool> DeleteStepAsync(int stepId);
    Task<ProductionStepDto?> CompleteStepAsync(int stepId, CompleteStepDto dto, int userId);

    // Inputs
    Task<ProductionInputDto?> AddInputAsync(int stepId, CreateProductionInputDto dto, int userId);
    Task<bool> DeleteInputAsync(int inputId);

    // Helpers
    Task<Merchandise> QuickCreateMerchandiseAsync(QuickCreateMerchandiseDto dto, int userId);
    Task RecalculateOrderCostsAsync(int orderId);
  }
}
