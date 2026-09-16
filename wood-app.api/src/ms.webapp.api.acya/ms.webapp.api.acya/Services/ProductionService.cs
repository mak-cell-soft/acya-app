using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs.Production;
using ms.webapp.api.acya.core.Entities.Production;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure;
using ms.webapp.api.acya.infrastructure.Repositories;

namespace ms.webapp.api.acya.api.Services
{
  /// <summary>
  /// Production workflow service handling state transitions and atomic stock balance updates.
  /// </summary>
  public class ProductionService : IProductionService
  {
    private readonly WoodAppContext _context;
    private readonly IProductionRepository _productionRepo;
    private readonly StockRepository _stockRepo;
    private readonly ILogger<ProductionService> _logger;

    public ProductionService(
      WoodAppContext context,
      IProductionRepository productionRepo,
      StockRepository stockRepo,
      ILogger<ProductionService> logger)
    {
      _context = context;
      _productionRepo = productionRepo;
      _stockRepo = stockRepo;
      _logger = logger;
    }

    /// <summary>
    /// Moves a planned order into InProgress status.
    /// </summary>
    public async Task<(bool Success, string Message, ProductionOrderDto? Order)> StartOrderAsync(int orderId, int userId)
    {
      var order = await _context.ProductionOrders
        .Include(o => o.Steps)
        .FirstOrDefaultAsync(o => o.Id == orderId && !o.IsDeleted);

      if (order == null)
      {
        return (false, "Ordre de fabrication introuvable.", null);
      }

      if (order.Status != ProductionStatus.Planned)
      {
        return (false, $"Impossible de démarrer l'ordre: statut actuel '{order.Status}'.", null);
      }

      order.Status = ProductionStatus.InProgress;
      order.ActualStartDate = DateTime.UtcNow;
      order.UpdatedById = userId;
      order.UpdateDate = DateTime.UtcNow;

      // Also mark the first step InProgress if planned
      var firstStep = order.Steps.OrderBy(s => s.StepNumber).FirstOrDefault();
      if (firstStep != null && firstStep.Status == ProductionStepStatus.Planned)
      {
        firstStep.Status = ProductionStepStatus.InProgress;
        firstStep.StartDate = DateTime.UtcNow;
        firstStep.UpdatedById = userId;
        firstStep.UpdateDate = DateTime.UtcNow;
      }

      await _context.SaveChangesAsync();
      var dto = await _productionRepo.GetOrderByIdAsync(orderId);
      return (true, "Ordre de fabrication démarré avec succès.", dto);
    }

    /// <summary>
    /// Validates a production order, atomically deducting raw material inputs and adding output merchandise to stock.
    /// Wrapped in a database transaction with full rollback on any failure (e.g. insufficient stock).
    /// </summary>
    public async Task<(bool Success, string Message, ProductionOrderDto? Order)> ValidateOrderAsync(int orderId, int userId)
    {
      var order = await _context.ProductionOrders
        .Include(o => o.SalesSite)
        .Include(o => o.Steps)
          .ThenInclude(s => s.OutputMerchandise)
            .ThenInclude(m => m!.Articles)
        .Include(o => o.Steps)
          .ThenInclude(s => s.Inputs)
            .ThenInclude(i => i.Merchandise)
              .ThenInclude(m => m!.Articles)
        .FirstOrDefaultAsync(o => o.Id == orderId && !o.IsDeleted);

      if (order == null)
      {
        return (false, "Ordre de fabrication introuvable.", null);
      }

      if (order.Status == ProductionStatus.Validated)
      {
        return (false, "Cet ordre de fabrication est déjà validé.", null);
      }

      if (order.Status == ProductionStatus.Cancelled)
      {
        return (false, "Impossible de valider un ordre annulé.", null);
      }

      if (!order.Steps.Any())
      {
        return (false, "Impossible de valider un ordre sans étapes de fabrication.", null);
      }

      // Check if all inputs have a valid merchandise and quantity
      var allInputs = order.Steps.SelectMany(s => s.Inputs).ToList();
      if (!allInputs.Any())
      {
        return (false, "Impossible de valider un ordre sans matières consommées.", null);
      }

      // Pre-check stock availability for all inputs before entering the transaction
      foreach (var input in allInputs)
      {
        double reqQty = input.ActualQuantity ?? input.PlannedQuantity;
        if (reqQty <= 0) continue;

        var stockRecord = await _context.Stocks
          .AsNoTracking()
          .FirstOrDefaultAsync(s => s.MerchandiseId == input.MerchandiseId && s.SalesSiteId == order.SalesSiteId);

        var currentQty = stockRecord?.Quantity ?? 0;
        var allowNegative = input.Merchandise?.AllowNegativStock ?? false;

        if (!allowNegative && currentQty < reqQty)
        {
          var articleName = input.MerchandiseDesignation ?? input.MerchandiseRef ?? $"ID #{input.MerchandiseId}";
          return (false, $"Stock insuffisant pour '{articleName}' au dépôt sélectionné. Requis: {reqQty}, Disponible: {currentQty}.", null);
        }
      }

      // Execute atomic stock transaction
      using var transaction = await _context.Database.BeginTransactionAsync();
      try
      {
        var salesSite = order.SalesSite ?? await _context.SalesSites.FirstOrDefaultAsync(s => s.Id == order.SalesSiteId);
        if (salesSite == null)
        {
          throw new InvalidOperationException($"Site de vente avec l'ID {order.SalesSiteId} introuvable.");
        }

        // 1. Consume all inputs (Stock OUT)
        foreach (var input in allInputs)
        {
          double qtyToDeduct = input.ActualQuantity ?? input.PlannedQuantity;
          if (qtyToDeduct <= 0) continue;

          var merch = input.Merchandise ?? await _context.Merchandises.Include(m => m.Articles).FirstOrDefaultAsync(m => m.Id == input.MerchandiseId);

          var stockTransaction = new Stock
          {
            MerchandiseId = input.MerchandiseId,
            Merchandises = merch,
            SalesSiteId = order.SalesSiteId,
            SalesSites = salesSite,
            Quantity = qtyToDeduct,
            Type = TransactionType.Retrieve,
            CreationDate = DateTime.UtcNow,
            UpdateDate = DateTime.UtcNow
          };

          await _stockRepo.HandleTransaction(stockTransaction, bypassNegativeCheck: false);
        }

        // 2. Add outputs (Stock IN)
        foreach (var step in order.Steps)
        {
          if (step.OutputMerchandiseId.HasValue && step.OutputMerchandiseId.Value > 0)
          {
            double outputQty = step.ActualOutputQuantity ?? step.PlannedOutputQuantity;
            if (outputQty > 0)
            {
              var outMerch = step.OutputMerchandise ?? await _context.Merchandises.Include(m => m.Articles).FirstOrDefaultAsync(m => m.Id == step.OutputMerchandiseId.Value);

              var stockAdd = new Stock
              {
                MerchandiseId = step.OutputMerchandiseId.Value,
                Merchandises = outMerch,
                SalesSiteId = order.SalesSiteId,
                SalesSites = salesSite,
                Quantity = outputQty,
                Type = TransactionType.Add,
                CreationDate = DateTime.UtcNow,
                UpdateDate = DateTime.UtcNow
              };

              await _stockRepo.HandleTransaction(stockAdd, bypassNegativeCheck: true);
            }
          }
        }

        // 3. Mark all steps as Completed if not already
        foreach (var step in order.Steps)
        {
          if (step.Status != ProductionStepStatus.Completed)
          {
            step.Status = ProductionStepStatus.Completed;
            step.EndDate ??= DateTime.UtcNow;
            step.ActualOutputQuantity ??= step.PlannedOutputQuantity;
            step.UpdatedById = userId;
            step.UpdateDate = DateTime.UtcNow;
          }
        }

        // 4. Update order state and calculate final unit production cost
        order.Status = ProductionStatus.Validated;
        order.ActualEndDate ??= DateTime.UtcNow;
        order.UpdatedById = userId;
        order.UpdateDate = DateTime.UtcNow;

        var lastStep = order.Steps.OrderByDescending(s => s.StepNumber).FirstOrDefault();
        if (lastStep != null && (lastStep.ActualOutputQuantity.HasValue || lastStep.PlannedOutputQuantity > 0))
        {
          order.ActualOutputQuantity = lastStep.ActualOutputQuantity ?? lastStep.PlannedOutputQuantity;
        }

        await _context.SaveChangesAsync();
        await _productionRepo.RecalculateOrderCostsAsync(order.Id);

        await transaction.CommitAsync();

        _logger.LogInformation("Production order {Reference} (ID: {OrderId}) validated successfully.", order.Reference, order.Id);

        var dto = await _productionRepo.GetOrderByIdAsync(orderId);
        return (true, "Ordre de fabrication validé avec succès. Les mouvements de stock ont été enregistrés.", dto);
      }
      catch (Exception ex)
      {
        await transaction.RollbackAsync();
        _logger.LogError(ex, "Error validating production order {OrderId}: {Message}", orderId, ex.Message);
        return (false, $"Échec de la validation: {ex.Message}", null);
      }
    }

    /// <summary>
    /// Cancels a production order. If the order was already validated, reverses all stock movements atomically.
    /// </summary>
    public async Task<(bool Success, string Message, ProductionOrderDto? Order)> CancelOrderAsync(int orderId, int userId)
    {
      var order = await _context.ProductionOrders
        .Include(o => o.SalesSite)
        .Include(o => o.Steps)
          .ThenInclude(s => s.OutputMerchandise)
            .ThenInclude(m => m!.Articles)
        .Include(o => o.Steps)
          .ThenInclude(s => s.Inputs)
            .ThenInclude(i => i.Merchandise)
              .ThenInclude(m => m!.Articles)
        .FirstOrDefaultAsync(o => o.Id == orderId && !o.IsDeleted);

      if (order == null)
      {
        return (false, "Ordre de fabrication introuvable.", null);
      }

      if (order.Status == ProductionStatus.Cancelled)
      {
        return (false, "Cet ordre de fabrication est déjà annulé.", null);
      }

      // If order was already validated, we must reverse all stock movements atomically
      if (order.Status == ProductionStatus.Validated)
      {
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
          var salesSite = order.SalesSite ?? await _context.SalesSites.FirstOrDefaultAsync(s => s.Id == order.SalesSiteId);
          if (salesSite == null)
          {
            throw new InvalidOperationException($"Site de vente #{order.SalesSiteId} introuvable.");
          }

          // 1. Re-add consumed inputs back to stock
          var allInputs = order.Steps.SelectMany(s => s.Inputs).ToList();
          foreach (var input in allInputs)
          {
            double qtyToReturn = input.ActualQuantity ?? input.PlannedQuantity;
            if (qtyToReturn <= 0) continue;

            var merch = input.Merchandise ?? await _context.Merchandises.Include(m => m.Articles).FirstOrDefaultAsync(m => m.Id == input.MerchandiseId);

            var stockAdd = new Stock
            {
              MerchandiseId = input.MerchandiseId,
              Merchandises = merch,
              SalesSiteId = order.SalesSiteId,
              SalesSites = salesSite,
              Quantity = qtyToReturn,
              Type = TransactionType.Add,
              CreationDate = DateTime.UtcNow,
              UpdateDate = DateTime.UtcNow
            };

            await _stockRepo.HandleTransaction(stockAdd, bypassNegativeCheck: true);
          }

          // 2. Deduct produced outputs from stock
          foreach (var step in order.Steps)
          {
            if (step.OutputMerchandiseId.HasValue && step.OutputMerchandiseId.Value > 0)
            {
              double outputQty = step.ActualOutputQuantity ?? step.PlannedOutputQuantity;
              if (outputQty > 0)
              {
                var outMerch = step.OutputMerchandise ?? await _context.Merchandises.Include(m => m.Articles).FirstOrDefaultAsync(m => m.Id == step.OutputMerchandiseId.Value);

                var stockRetrieve = new Stock
                {
                  MerchandiseId = step.OutputMerchandiseId.Value,
                  Merchandises = outMerch,
                  SalesSiteId = order.SalesSiteId,
                  SalesSites = salesSite,
                  Quantity = outputQty,
                  Type = TransactionType.Retrieve,
                  CreationDate = DateTime.UtcNow,
                  UpdateDate = DateTime.UtcNow
                };

                await _stockRepo.HandleTransaction(stockRetrieve, bypassNegativeCheck: true);
              }
            }
          }

          order.Status = ProductionStatus.Cancelled;
          order.UpdatedById = userId;
          order.UpdateDate = DateTime.UtcNow;

          await _context.SaveChangesAsync();
          await transaction.CommitAsync();

          _logger.LogInformation("Validated production order {Reference} cancelled and stock reversed.", order.Reference);

          var dto = await _productionRepo.GetOrderByIdAsync(orderId);
          return (true, "Ordre de fabrication annulé et stocks réajustés avec succès.", dto);
        }
        catch (Exception ex)
        {
          await transaction.RollbackAsync();
          _logger.LogError(ex, "Error reversing stock for production order {OrderId}: {Message}", orderId, ex.Message);
          return (false, $"Échec de l'annulation: {ex.Message}", null);
        }
      }
      else
      {
        // Not yet validated, just set to Cancelled
        order.Status = ProductionStatus.Cancelled;
        order.UpdatedById = userId;
        order.UpdateDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        var dto = await _productionRepo.GetOrderByIdAsync(orderId);
        return (true, "Ordre de fabrication annulé.", dto);
      }
    }
  }
}
