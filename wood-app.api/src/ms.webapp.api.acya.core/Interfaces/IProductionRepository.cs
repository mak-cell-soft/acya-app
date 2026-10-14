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

    // Step Workers (Assignments)
    Task<List<ProductionStepWorkerDto>> GetStepWorkersAsync(int stepId);
    Task<ProductionStepWorkerDto?> AddStepWorkerAsync(int stepId, CreateProductionStepWorkerDto dto, int userId);
    Task<bool> UpdateStepWorkerAsync(int workerId, UpdateProductionStepWorkerDto dto, int userId);
    Task<bool> DeleteStepWorkerAsync(int workerId);

    // Step Work Logs
    Task<List<ProductionStepWorkLogDto>> GetStepWorkLogsAsync(int stepId);
    Task<ProductionStepWorkLogDto?> AddStepWorkLogAsync(int stepId, CreateProductionStepWorkLogDto dto, int userId);
    Task<bool> UpdateStepWorkLogAsync(int workLogId, UpdateProductionStepWorkLogDto dto, int userId);
    Task<bool> DeleteStepWorkLogAsync(int workLogId);

    // Other Work Entries (Payable Work Outside Manufacturing)
    Task<List<ProductionOtherWorkEntryDto>> GetOtherWorkEntriesAsync(System.DateTime? startDate = null, System.DateTime? endDate = null, int? personId = null);
    Task<ProductionOtherWorkEntryDto?> GetOtherWorkEntryByIdAsync(int id);
    Task<ProductionOtherWorkEntryDto> CreateOtherWorkEntryAsync(CreateProductionOtherWorkEntryDto dto, int userId);
    Task<bool> UpdateOtherWorkEntryAsync(int id, UpdateProductionOtherWorkEntryDto dto, int userId);
    Task<bool> DeleteOtherWorkEntryAsync(int id, int userId);

    // Monthly Employee Payable Summary
    Task<MonthlyEmployeePayableSummaryDto> GetMonthlyPayableSummaryAsync(int year, int month);

    // Helpers
    Task<Merchandise> QuickCreateMerchandiseAsync(QuickCreateMerchandiseDto dto, int userId);
    Task RecalculateOrderCostsAsync(int orderId);
  }
}
