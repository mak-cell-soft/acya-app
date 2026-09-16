using System.Threading.Tasks;
using ms.webapp.api.acya.core.Entities.DTOs.Production;

namespace ms.webapp.api.acya.core.Interfaces
{
  /// <summary>
  /// Domain service responsible for orchestrating production lifecycle workflows and atomic stock validation.
  /// </summary>
  public interface IProductionService
  {
    Task<(bool Success, string Message, ProductionOrderDto? Order)> StartOrderAsync(int orderId, int userId);
    Task<(bool Success, string Message, ProductionOrderDto? Order)> ValidateOrderAsync(int orderId, int userId);
    Task<(bool Success, string Message, ProductionOrderDto? Order)> CancelOrderAsync(int orderId, int userId);
  }
}
