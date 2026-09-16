using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs.Production;
using ms.webapp.api.acya.core.Entities.Production;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure.Core;

namespace ms.webapp.api.acya.infrastructure.Repositories
{
  public class ProductionRepository : CoreRepository<ProductionOrder, WoodAppContext>, IProductionRepository
  {
    public ProductionRepository(WoodAppContext context) : base(context)
    {
    }

    #region Orders

    public async Task<List<ProductionOrderDto>> GetAllOrdersAsync(ProductionStatus? status = null, int? salesSiteId = null, string? search = null)
    {
      var query = context.ProductionOrders
        .AsNoTracking()
        .Where(o => !o.IsDeleted)
        .Include(o => o.SalesSite)
        .Include(o => o.Steps)
          .ThenInclude(s => s.OutputMerchandise)
            .ThenInclude(m => m!.Articles)
        .Include(o => o.Steps)
          .ThenInclude(s => s.Inputs)
            .ThenInclude(i => i.Merchandise)
              .ThenInclude(m => m!.Articles)
        .AsQueryable();

      if (status.HasValue)
      {
        query = query.Where(o => o.Status == status.Value);
      }

      if (salesSiteId.HasValue && salesSiteId.Value > 0)
      {
        query = query.Where(o => o.SalesSiteId == salesSiteId.Value);
      }

      if (!string.IsNullOrWhiteSpace(search))
      {
        var s = search.Trim().ToLower();
        query = query.Where(o =>
          o.Reference.ToLower().Contains(s) ||
          (o.Description != null && o.Description.ToLower().Contains(s)) ||
          (o.Notes != null && o.Notes.ToLower().Contains(s)));
      }

      var orders = await query
        .OrderByDescending(o => o.CreationDate)
        .ToListAsync();

      return orders.Select(MapToOrderDto).ToList();
    }

    public async Task<ProductionOrderDto?> GetOrderByIdAsync(int id)
    {
      var order = await context.ProductionOrders
        .AsNoTracking()
        .Where(o => o.Id == id && !o.IsDeleted)
        .Include(o => o.SalesSite)
        .Include(o => o.Steps.OrderBy(s => s.StepNumber))
          .ThenInclude(s => s.OutputMerchandise)
            .ThenInclude(m => m!.Articles)
        .Include(o => o.Steps)
          .ThenInclude(s => s.Inputs)
            .ThenInclude(i => i.Merchandise)
              .ThenInclude(m => m!.Articles)
        .FirstOrDefaultAsync();

      if (order == null) return null;

      var dto = MapToOrderDto(order);

      // Populate current stock levels for inputs
      var merchandiseIds = order.Steps
        .SelectMany(s => s.Inputs)
        .Select(i => i.MerchandiseId)
        .Distinct()
        .ToList();

      if (merchandiseIds.Any())
      {
        var stocks = await context.Stocks
          .AsNoTracking()
          .Where(st => st.SalesSiteId == order.SalesSiteId && merchandiseIds.Contains(st.MerchandiseId))
          .ToDictionaryAsync(st => st.MerchandiseId, st => st.Quantity);

        foreach (var step in dto.Steps)
        {
          foreach (var input in step.Inputs)
          {
            if (stocks.TryGetValue(input.MerchandiseId, out var qty))
            {
              input.CurrentStockQuantity = qty;
            }
            else
            {
              input.CurrentStockQuantity = 0;
            }
          }
        }
      }

      return dto;
    }

    public async Task<ProductionOrder?> GetOrderEntityByIdAsync(int id)
    {
      return await context.ProductionOrders
        .Where(o => o.Id == id && !o.IsDeleted)
        .Include(o => o.SalesSite)
        .Include(o => o.Steps.OrderBy(s => s.StepNumber))
          .ThenInclude(s => s.OutputMerchandise)
            .ThenInclude(m => m!.Articles)
        .Include(o => o.Steps)
          .ThenInclude(s => s.Inputs)
            .ThenInclude(i => i.Merchandise)
              .ThenInclude(m => m!.Articles)
        .FirstOrDefaultAsync();
    }

    public async Task<ProductionOrderDto> CreateOrderAsync(CreateProductionOrderDto dto, int userId)
    {
      var order = new ProductionOrder
      {
        Reference = !string.IsNullOrWhiteSpace(dto.Reference)
          ? dto.Reference
          : $"OF-{DateTime.UtcNow:yyyyMMdd}-{new Random().Next(100, 999)}",
        Description = dto.Description,
        Notes = dto.Notes,
        SalesSiteId = dto.SalesSiteId,
        Status = ProductionStatus.Planned,
        PlannedStartDate = dto.PlannedStartDate,
        PlannedEndDate = dto.PlannedEndDate,
        PlannedOutputQuantity = dto.PlannedOutputQuantity > 0 ? dto.PlannedOutputQuantity : 1.0,
        CreatedById = userId,
        CreationDate = DateTime.UtcNow,
        IsDeleted = false
      };

      // Add steps if provided
      if (dto.Steps != null && dto.Steps.Any())
      {
        int stepIdx = 1;
        foreach (var sDto in dto.Steps.OrderBy(s => s.StepNumber))
        {
          var step = new ProductionStep
          {
            StepNumber = sDto.StepNumber > 0 ? sDto.StepNumber : stepIdx++,
            Name = sDto.Name,
            Description = sDto.Description,
            Status = ProductionStepStatus.Planned,
            StartDate = sDto.StartDate,
            EndDate = sDto.EndDate,
            LaborCost = sDto.LaborCost,
            OtherCost = sDto.OtherCost,
            OutputMerchandiseId = sDto.OutputMerchandiseId,
            PlannedOutputQuantity = sDto.PlannedOutputQuantity > 0 ? sDto.PlannedOutputQuantity : 1.0,
            CreatedById = userId,
            CreationDate = DateTime.UtcNow
          };

          if (sDto.Inputs != null && sDto.Inputs.Any())
          {
            var merchIds = sDto.Inputs.Select(i => i.MerchandiseId).ToList();
            var merchList = await context.Merchandises
              .Include(m => m.Articles)
              .Where(m => merchIds.Contains(m.Id))
              .ToDictionaryAsync(m => m.Id);

            foreach (var iDto in sDto.Inputs)
            {
              merchList.TryGetValue(iDto.MerchandiseId, out var merch);
              var input = new ProductionInput
              {
                MerchandiseId = iDto.MerchandiseId,
                MerchandiseRef = merch?.PackageReference,
                MerchandiseDesignation = merch?.Articles?.Description,
                Unit = merch?.Articles?.Unit,
                PlannedQuantity = iDto.PlannedQuantity > 0 ? iDto.PlannedQuantity : 1.0,
                UnitCost = iDto.UnitCost ?? (merch?.Articles?.LastPurchasePriceTTC != null ? (decimal)merch.Articles.LastPurchasePriceTTC : 0),
                CreatedById = userId,
                CreationDate = DateTime.UtcNow
              };
              input.TotalCost = (input.UnitCost ?? 0) * (decimal)input.PlannedQuantity;
              step.Inputs.Add(input);
            }
          }

          order.Steps.Add(step);
        }
      }

      context.ProductionOrders.Add(order);
      await context.SaveChangesAsync();

      await RecalculateOrderCostsAsync(order.Id);

      return (await GetOrderByIdAsync(order.Id))!;
    }

    public async Task<bool> UpdateOrderAsync(int id, UpdateProductionOrderDto dto, int userId)
    {
      var order = await context.ProductionOrders.FirstOrDefaultAsync(o => o.Id == id && !o.IsDeleted);
      if (order == null) return false;

      if (order.Status == ProductionStatus.Validated || order.Status == ProductionStatus.Cancelled)
      {
        throw new InvalidOperationException("Cannot modify an order that has already been validated or cancelled.");
      }

      order.Description = dto.Description;
      order.Notes = dto.Notes;
      if (dto.SalesSiteId > 0) order.SalesSiteId = dto.SalesSiteId;
      order.PlannedStartDate = dto.PlannedStartDate;
      order.PlannedEndDate = dto.PlannedEndDate;
      if (dto.PlannedOutputQuantity > 0) order.PlannedOutputQuantity = dto.PlannedOutputQuantity;

      order.UpdatedById = userId;
      order.UpdateDate = DateTime.UtcNow;

      await context.SaveChangesAsync();
      await RecalculateOrderCostsAsync(id);
      return true;
    }

    public async Task<bool> SoftDeleteOrderAsync(int id, int userId)
    {
      var order = await context.ProductionOrders.FirstOrDefaultAsync(o => o.Id == id && !o.IsDeleted);
      if (order == null) return false;

      if (order.Status == ProductionStatus.Validated)
      {
        throw new InvalidOperationException("Cannot delete a validated production order. Cancel it first.");
      }

      order.IsDeleted = true;
      order.UpdatedById = userId;
      order.UpdateDate = DateTime.UtcNow;

      await context.SaveChangesAsync();
      return true;
    }

    #endregion

    #region Steps

    public async Task<ProductionStepDto?> AddStepAsync(int orderId, CreateProductionStepDto dto, int userId)
    {
      var order = await context.ProductionOrders.FirstOrDefaultAsync(o => o.Id == orderId && !o.IsDeleted);
      if (order == null) return null;

      if (order.Status == ProductionStatus.Validated || order.Status == ProductionStatus.Cancelled)
      {
        throw new InvalidOperationException("Cannot add steps to a validated or cancelled order.");
      }

      int nextStepNum = await context.ProductionSteps
        .Where(s => s.ProductionOrderId == orderId)
        .Select(s => (int?)s.StepNumber)
        .MaxAsync() ?? 0;

      var step = new ProductionStep
      {
        ProductionOrderId = orderId,
        StepNumber = dto.StepNumber > 0 ? dto.StepNumber : nextStepNum + 1,
        Name = dto.Name,
        Description = dto.Description,
        Status = ProductionStepStatus.Planned,
        StartDate = dto.StartDate,
        EndDate = dto.EndDate,
        LaborCost = dto.LaborCost,
        OtherCost = dto.OtherCost,
        OutputMerchandiseId = dto.OutputMerchandiseId,
        PlannedOutputQuantity = dto.PlannedOutputQuantity > 0 ? dto.PlannedOutputQuantity : 1.0,
        CreatedById = userId,
        CreationDate = DateTime.UtcNow
      };

      if (dto.Inputs != null && dto.Inputs.Any())
      {
        var merchIds = dto.Inputs.Select(i => i.MerchandiseId).ToList();
        var merchList = await context.Merchandises
          .Include(m => m.Articles)
          .Where(m => merchIds.Contains(m.Id))
          .ToDictionaryAsync(m => m.Id);

        foreach (var iDto in dto.Inputs)
        {
          merchList.TryGetValue(iDto.MerchandiseId, out var merch);
          var input = new ProductionInput
          {
            MerchandiseId = iDto.MerchandiseId,
            MerchandiseRef = merch?.PackageReference,
            MerchandiseDesignation = merch?.Articles?.Description,
            Unit = merch?.Articles?.Unit,
            PlannedQuantity = iDto.PlannedQuantity > 0 ? iDto.PlannedQuantity : 1.0,
            UnitCost = iDto.UnitCost ?? (merch?.Articles?.LastPurchasePriceTTC != null ? (decimal)merch.Articles.LastPurchasePriceTTC : 0),
            CreatedById = userId,
            CreationDate = DateTime.UtcNow
          };
          input.TotalCost = (input.UnitCost ?? 0) * (decimal)input.PlannedQuantity;
          step.Inputs.Add(input);
        }
      }

      context.ProductionSteps.Add(step);
      await context.SaveChangesAsync();

      await RecalculateOrderCostsAsync(orderId);

      var refreshedOrder = await GetOrderByIdAsync(orderId);
      return refreshedOrder?.Steps.FirstOrDefault(s => s.Id == step.Id);
    }

    public async Task<bool> UpdateStepAsync(int stepId, UpdateProductionStepDto dto, int userId)
    {
      var step = await context.ProductionSteps
        .Include(s => s.ProductionOrder)
        .FirstOrDefaultAsync(s => s.Id == stepId);

      if (step == null || step.ProductionOrder == null || step.ProductionOrder.IsDeleted) return false;

      if (step.ProductionOrder.Status == ProductionStatus.Validated || step.ProductionOrder.Status == ProductionStatus.Cancelled)
      {
        throw new InvalidOperationException("Cannot update steps of a finalized order.");
      }

      step.Name = dto.Name;
      step.Description = dto.Description;
      step.StepNumber = dto.StepNumber;
      step.StartDate = dto.StartDate;
      step.EndDate = dto.EndDate;
      step.LaborCost = dto.LaborCost;
      step.OtherCost = dto.OtherCost;
      step.OutputMerchandiseId = dto.OutputMerchandiseId;
      step.PlannedOutputQuantity = dto.PlannedOutputQuantity;
      step.ActualOutputQuantity = dto.ActualOutputQuantity;
      step.UpdatedById = userId;
      step.UpdateDate = DateTime.UtcNow;

      await context.SaveChangesAsync();
      await RecalculateOrderCostsAsync(step.ProductionOrderId);
      return true;
    }

    public async Task<bool> DeleteStepAsync(int stepId)
    {
      var step = await context.ProductionSteps
        .Include(s => s.ProductionOrder)
        .FirstOrDefaultAsync(s => s.Id == stepId);

      if (step == null || step.ProductionOrder == null || step.ProductionOrder.IsDeleted) return false;

      if (step.ProductionOrder.Status == ProductionStatus.Validated || step.ProductionOrder.Status == ProductionStatus.Cancelled)
      {
        throw new InvalidOperationException("Cannot delete steps of a finalized order.");
      }

      int orderId = step.ProductionOrderId;
      context.ProductionSteps.Remove(step);
      await context.SaveChangesAsync();

      await RecalculateOrderCostsAsync(orderId);
      return true;
    }

    public async Task<ProductionStepDto?> CompleteStepAsync(int stepId, CompleteStepDto dto, int userId)
    {
      var step = await context.ProductionSteps
        .Include(s => s.ProductionOrder)
        .Include(s => s.Inputs)
        .FirstOrDefaultAsync(s => s.Id == stepId);

      if (step == null || step.ProductionOrder == null || step.ProductionOrder.IsDeleted) return null;

      if (step.ProductionOrder.Status == ProductionStatus.Validated || step.ProductionOrder.Status == ProductionStatus.Cancelled)
      {
        throw new InvalidOperationException("Cannot complete step on a finalized order.");
      }

      step.Status = ProductionStepStatus.Completed;
      step.EndDate = DateTime.UtcNow;

      if (dto.ActualOutputQuantity.HasValue)
      {
        step.ActualOutputQuantity = dto.ActualOutputQuantity.Value;
      }
      else if (!step.ActualOutputQuantity.HasValue)
      {
        step.ActualOutputQuantity = step.PlannedOutputQuantity;
      }

      if (dto.LaborCost.HasValue) step.LaborCost = dto.LaborCost.Value;
      if (dto.OtherCost.HasValue) step.OtherCost = dto.OtherCost.Value;

      // Update actual consumption on inputs (Q2 decision)
      if (dto.Inputs != null && dto.Inputs.Any())
      {
        var inputDict = dto.Inputs.ToDictionary(i => i.InputId);
        foreach (var input in step.Inputs)
        {
          if (inputDict.TryGetValue(input.Id, out var actual))
          {
            input.ActualQuantity = actual.ActualQuantity;
            if (actual.UnitCost.HasValue) input.UnitCost = actual.UnitCost.Value;
            input.TotalCost = (input.UnitCost ?? 0) * (decimal)(input.ActualQuantity ?? input.PlannedQuantity);
          }
          else if (!input.ActualQuantity.HasValue)
          {
            input.ActualQuantity = input.PlannedQuantity;
            input.TotalCost = (input.UnitCost ?? 0) * (decimal)input.PlannedQuantity;
          }
        }
      }
      else
      {
        // Default actual quantities to planned if none passed
        foreach (var input in step.Inputs)
        {
          if (!input.ActualQuantity.HasValue)
          {
            input.ActualQuantity = input.PlannedQuantity;
            input.TotalCost = (input.UnitCost ?? 0) * (decimal)input.PlannedQuantity;
          }
        }
      }

      step.UpdatedById = userId;
      step.UpdateDate = DateTime.UtcNow;

      // If all steps are completed, transition order to Completed
      var allSteps = await context.ProductionSteps
        .Where(s => s.ProductionOrderId == step.ProductionOrderId)
        .ToListAsync();

      if (allSteps.All(s => s.Id == step.Id || s.Status == ProductionStepStatus.Completed))
      {
        step.ProductionOrder.Status = ProductionStatus.Completed;
        step.ProductionOrder.ActualEndDate = DateTime.UtcNow;
      }
      else
      {
        step.ProductionOrder.Status = ProductionStatus.InProgress;
        if (!step.ProductionOrder.ActualStartDate.HasValue)
        {
          step.ProductionOrder.ActualStartDate = DateTime.UtcNow;
        }
      }

      await context.SaveChangesAsync();
      await RecalculateOrderCostsAsync(step.ProductionOrderId);

      var refreshedOrder = await GetOrderByIdAsync(step.ProductionOrderId);
      return refreshedOrder?.Steps.FirstOrDefault(s => s.Id == step.Id);
    }

    #endregion

    #region Inputs

    public async Task<ProductionInputDto?> AddInputAsync(int stepId, CreateProductionInputDto dto, int userId)
    {
      var step = await context.ProductionSteps
        .Include(s => s.ProductionOrder)
        .FirstOrDefaultAsync(s => s.Id == stepId);

      if (step == null || step.ProductionOrder == null || step.ProductionOrder.IsDeleted) return null;

      if (step.ProductionOrder.Status == ProductionStatus.Validated || step.ProductionOrder.Status == ProductionStatus.Cancelled)
      {
        throw new InvalidOperationException("Cannot add inputs to a finalized order.");
      }

      var merch = await context.Merchandises
        .Include(m => m.Articles)
        .FirstOrDefaultAsync(m => m.Id == dto.MerchandiseId);

      if (merch == null) throw new ArgumentException("Marchandise introuvable.");

      var input = new ProductionInput
      {
        ProductionStepId = stepId,
        MerchandiseId = dto.MerchandiseId,
        MerchandiseRef = merch.PackageReference,
        MerchandiseDesignation = merch.Articles?.Description,
        Unit = merch.Articles?.Unit,
        PlannedQuantity = dto.PlannedQuantity > 0 ? dto.PlannedQuantity : 1.0,
        UnitCost = dto.UnitCost ?? (merch.Articles?.LastPurchasePriceTTC != null ? (decimal)merch.Articles.LastPurchasePriceTTC : 0),
        CreatedById = userId,
        CreationDate = DateTime.UtcNow
      };
      input.TotalCost = (input.UnitCost ?? 0) * (decimal)input.PlannedQuantity;

      context.ProductionInputs.Add(input);
      await context.SaveChangesAsync();

      await RecalculateOrderCostsAsync(step.ProductionOrderId);

      return new ProductionInputDto
      {
        Id = input.Id,
        Guid = input.Guid,
        ProductionStepId = input.ProductionStepId,
        MerchandiseId = input.MerchandiseId,
        MerchandiseRef = input.MerchandiseRef,
        MerchandiseDesignation = input.MerchandiseDesignation,
        Unit = input.Unit,
        PlannedQuantity = input.PlannedQuantity,
        ActualQuantity = input.ActualQuantity,
        UnitCost = input.UnitCost,
        TotalCost = input.TotalCost
      };
    }

    public async Task<bool> DeleteInputAsync(int inputId)
    {
      var input = await context.ProductionInputs
        .Include(i => i.ProductionStep)
          .ThenInclude(s => s!.ProductionOrder)
        .FirstOrDefaultAsync(i => i.Id == inputId);

      if (input == null || input.ProductionStep == null || input.ProductionStep.ProductionOrder == null || input.ProductionStep.ProductionOrder.IsDeleted)
        return false;

      if (input.ProductionStep.ProductionOrder.Status == ProductionStatus.Validated || input.ProductionStep.ProductionOrder.Status == ProductionStatus.Cancelled)
      {
        throw new InvalidOperationException("Cannot delete inputs from a finalized order.");
      }

      int orderId = input.ProductionStep.ProductionOrderId;
      context.ProductionInputs.Remove(input);
      await context.SaveChangesAsync();

      await RecalculateOrderCostsAsync(orderId);
      return true;
    }

    #endregion

    #region Helpers & Calculations

    /// <summary>
    /// Creates a new Merchandise in the catalog for on-the-fly output creation (Q3 user decision).
    /// </summary>
    public async Task<Merchandise> QuickCreateMerchandiseAsync(QuickCreateMerchandiseDto dto, int userId)
    {
      var article = await context.Articles.FindAsync(dto.ArticleId);
      if (article == null) throw new ArgumentException($"Article with Id {dto.ArticleId} not found.");

      var merch = new Merchandise
      {
        ArticleId = dto.ArticleId,
        PackageReference = !string.IsNullOrWhiteSpace(dto.PackageReference)
          ? dto.PackageReference.Trim()
          : $"PR-{DateTime.UtcNow:yyMMdd}-{new Random().Next(100, 999)}",
        Description = dto.Description ?? $"Produit fabriqué - {article.Description}",
        IsInvoicible = dto.IsInvoicible,
        AllowNegativStock = dto.AllowNegativStock,
        IsDeleted = false,
        UpdatedById = userId
      };

      context.Merchandises.Add(merch);
      await context.SaveChangesAsync();

      return merch;
    }

    public async Task RecalculateOrderCostsAsync(int orderId)
    {
      var order = await context.ProductionOrders
        .Include(o => o.Steps)
          .ThenInclude(s => s.Inputs)
        .FirstOrDefaultAsync(o => o.Id == orderId);

      if (order == null) return;

      decimal totalMaterial = 0;
      decimal totalLabor = 0;
      decimal totalOther = 0;

      foreach (var step in order.Steps)
      {
        totalLabor += step.LaborCost ?? 0;
        totalOther += step.OtherCost ?? 0;

        foreach (var input in step.Inputs)
        {
          var qty = (decimal)(input.ActualQuantity ?? input.PlannedQuantity);
          var cost = (input.UnitCost ?? 0) * qty;
          input.TotalCost = cost;
          totalMaterial += cost;
        }
      }

      order.TotalMaterialCost = totalMaterial;
      order.TotalLaborCost = totalLabor;
      order.TotalOtherCost = totalOther;
      order.TotalProductionCost = totalMaterial + totalLabor + totalOther;

      var outputQty = order.ActualOutputQuantity ?? order.PlannedOutputQuantity;
      if (outputQty > 0)
      {
        order.UnitProductionCost = Math.Round((order.TotalProductionCost ?? 0) / (decimal)outputQty, 3);
      }

      await context.SaveChangesAsync();
    }

    private static ProductionOrderDto MapToOrderDto(ProductionOrder o)
    {
      return new ProductionOrderDto
      {
        Id = o.Id,
        Guid = o.Guid,
        Reference = o.Reference,
        Description = o.Description,
        Notes = o.Notes,
        SalesSiteId = o.SalesSiteId,
        SalesSiteName = o.SalesSite?.Address ?? $"Dépôt #{o.SalesSiteId}",
        Status = o.Status,
        PlannedStartDate = o.PlannedStartDate,
        PlannedEndDate = o.PlannedEndDate,
        ActualStartDate = o.ActualStartDate,
        ActualEndDate = o.ActualEndDate,
        TotalMaterialCost = o.TotalMaterialCost,
        TotalLaborCost = o.TotalLaborCost,
        TotalOtherCost = o.TotalOtherCost,
        TotalProductionCost = o.TotalProductionCost,
        UnitProductionCost = o.UnitProductionCost,
        PlannedOutputQuantity = o.PlannedOutputQuantity,
        ActualOutputQuantity = o.ActualOutputQuantity,
        CreatedById = o.CreatedById,
        CreationDate = o.CreationDate,
        UpdateDate = o.UpdateDate,
        Steps = o.Steps.OrderBy(s => s.StepNumber).Select(s => new ProductionStepDto
        {
          Id = s.Id,
          Guid = s.Guid,
          ProductionOrderId = s.ProductionOrderId,
          StepNumber = s.StepNumber,
          Name = s.Name,
          Description = s.Description,
          Status = s.Status,
          StartDate = s.StartDate,
          EndDate = s.EndDate,
          LaborCost = s.LaborCost,
          OtherCost = s.OtherCost,
          MaterialCost = s.Inputs.Sum(i => i.TotalCost ?? 0),
          TotalStepCost = (s.LaborCost ?? 0) + (s.OtherCost ?? 0) + s.Inputs.Sum(i => i.TotalCost ?? 0),
          OutputMerchandiseId = s.OutputMerchandiseId,
          OutputMerchandiseRef = s.OutputMerchandise?.PackageReference,
          OutputMerchandiseDesignation = s.OutputMerchandise?.Articles?.Description,
          PlannedOutputQuantity = s.PlannedOutputQuantity,
          ActualOutputQuantity = s.ActualOutputQuantity,
          Inputs = s.Inputs.Select(i => new ProductionInputDto
          {
            Id = i.Id,
            Guid = i.Guid,
            ProductionStepId = i.ProductionStepId,
            MerchandiseId = i.MerchandiseId,
            MerchandiseRef = i.MerchandiseRef ?? i.Merchandise?.PackageReference,
            MerchandiseDesignation = i.MerchandiseDesignation ?? i.Merchandise?.Articles?.Description,
            Unit = i.Unit ?? i.Merchandise?.Articles?.Unit,
            PlannedQuantity = i.PlannedQuantity,
            ActualQuantity = i.ActualQuantity,
            UnitCost = i.UnitCost,
            TotalCost = i.TotalCost
          }).ToList()
        }).ToList()
      };
    }

    #endregion
  }
}
