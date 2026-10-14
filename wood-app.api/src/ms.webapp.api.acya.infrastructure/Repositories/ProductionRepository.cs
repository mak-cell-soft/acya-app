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
        .Include(o => o.Steps)
          .ThenInclude(s => s.Workers)
        .Include(o => o.Steps)
          .ThenInclude(s => s.WorkLogs)
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
        .Include(o => o.Steps)
          .ThenInclude(s => s.OutputMerchandise)
            .ThenInclude(m => m!.Articles)
        .Include(o => o.Steps)
          .ThenInclude(s => s.Inputs)
            .ThenInclude(i => i.Merchandise)
              .ThenInclude(m => m!.Articles)
        .Include(o => o.Steps)
          .ThenInclude(s => s.Workers)
        .Include(o => o.Steps)
          .ThenInclude(s => s.WorkLogs)
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
          .GroupBy(st => st.MerchandiseId)
          .Select(g => new { MerchandiseId = g.Key, TotalQuantity = g.Sum(st => st.Quantity) })
          .ToDictionaryAsync(st => st.MerchandiseId, st => st.TotalQuantity);

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
              decimal defaultCost = 0m;
              if (merch?.Articles != null && merch.Articles.LastPurchasePriceTTC > 0)
              {
                defaultCost = (decimal)merch.Articles.LastPurchasePriceTTC;
              }

              decimal resolvedUnitCost = (iDto.UnitCost.HasValue && iDto.UnitCost.Value > 0)
                ? iDto.UnitCost.Value
                : defaultCost;

              var input = new ProductionInput
              {
                MerchandiseId = iDto.MerchandiseId,
                MerchandiseRef = merch?.PackageReference,
                MerchandiseDesignation = merch?.Articles?.Description,
                Unit = merch?.Articles?.Unit,
                PlannedQuantity = iDto.PlannedQuantity > 0 ? iDto.PlannedQuantity : 1.0,
                UnitCost = resolvedUnitCost,
                CreatedById = userId,
                CreationDate = DateTime.UtcNow
              };
              input.TotalCost = resolvedUnitCost * (decimal)input.PlannedQuantity;
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
        throw new InvalidOperationException("Impossible de supprimer un ordre de fabrication validé. Veuillez d'abord l'annuler pour rétablir les stocks.");
      }

      var hasWorkLogs = await context.ProductionStepWorkLogs
        .AnyAsync(w => w.ProductionStep != null && w.ProductionStep.ProductionOrderId == id);

      if (hasWorkLogs)
      {
        throw new InvalidOperationException("Impossible de supprimer cet ordre : des heures de travail d'employés sont enregistrées. Supprimez d'abord les pointages des employés, puis réessayez.");
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

      decimal defaultArticleCost = 0m;
      if (merch.Articles != null && merch.Articles.LastPurchasePriceTTC > 0)
      {
        defaultArticleCost = (decimal)merch.Articles.LastPurchasePriceTTC;
      }

      decimal resolvedUnitCost = (dto.UnitCost.HasValue && dto.UnitCost.Value > 0)
        ? dto.UnitCost.Value
        : defaultArticleCost;

      var input = new ProductionInput
      {
        ProductionStepId = stepId,
        MerchandiseId = dto.MerchandiseId,
        MerchandiseRef = merch.PackageReference,
        MerchandiseDesignation = merch.Articles?.Description,
        Unit = merch.Articles?.Unit,
        PlannedQuantity = dto.PlannedQuantity > 0 ? dto.PlannedQuantity : 1.0,
        UnitCost = resolvedUnitCost,
        CreatedById = userId,
        CreationDate = DateTime.UtcNow
      };
      input.TotalCost = resolvedUnitCost * (decimal)input.PlannedQuantity;

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
        TotalCost = input.TotalCost,
        AllowNegativStock = merch.AllowNegativStock
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
        .Include(o => o.Steps)
          .ThenInclude(s => s.WorkLogs)
        .FirstOrDefaultAsync(o => o.Id == orderId);

      if (order == null) return;

      decimal totalMaterial = 0;
      decimal totalLabor = 0;
      decimal totalOther = 0;

      foreach (var step in order.Steps)
      {
        decimal stepLaborManual = step.LaborCost ?? 0m;
        decimal stepLaborActual = step.WorkLogs?.Sum(w => w.CalculatedLaborAmount) ?? 0m;
        totalLabor += (stepLaborManual + stepLaborActual);
        totalOther += step.OtherCost ?? 0m;

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

    #endregion

    #region Step Workers

    public async Task<List<ProductionStepWorkerDto>> GetStepWorkersAsync(int stepId)
    {
      var workers = await context.ProductionStepWorkers
        .AsNoTracking()
        .Where(w => w.ProductionStepId == stepId)
        .Include(w => w.WorkLogs)
        .OrderBy(w => w.Id)
        .ToListAsync();

      return workers.Select(MapToWorkerDto).ToList();
    }

    public async Task<ProductionStepWorkerDto?> AddStepWorkerAsync(int stepId, CreateProductionStepWorkerDto dto, int userId)
    {
      if (dto.PlannedHours < 0) throw new ArgumentException("Les heures prévues ne peuvent pas être négatives.");
      if (dto.DefaultHourlyRate < 0) throw new ArgumentException("Le taux horaire ne peut pas être négatif.");

      var step = await context.ProductionSteps
        .Include(s => s.ProductionOrder)
        .FirstOrDefaultAsync(s => s.Id == stepId);

      if (step == null) return null;

      var order = step.ProductionOrder;
      if (order == null || order.Status == ProductionStatus.Validated || order.Status == ProductionStatus.Cancelled)
      {
        throw new InvalidOperationException("Impossible d'affecter un ouvrier à un ordre de fabrication validé ou annulé.");
      }

      var person = await context.Persons
        .AsNoTracking()
        .FirstOrDefaultAsync(p => p.Id == dto.PersonId && !p.IsDeleted);

      if (person == null)
      {
        throw new ArgumentException($"Employé #{dto.PersonId} introuvable ou inactif.");
      }

      bool alreadyAssigned = await context.ProductionStepWorkers
        .AnyAsync(w => w.ProductionStepId == stepId && w.PersonId == dto.PersonId);

      if (alreadyAssigned)
      {
        throw new InvalidOperationException("Cet employé est déjà affecté à cette étape de fabrication.");
      }

      string employeeFullName = !string.IsNullOrWhiteSpace(person.FullName)
        ? person.FullName
        : $"{person.Firstname} {person.Lastname}".Trim();

      var worker = new ProductionStepWorker
      {
        ProductionStepId = stepId,
        PersonId = dto.PersonId,
        EmployeeFullName = employeeFullName,
        PlannedHours = dto.PlannedHours,
        DefaultHourlyRate = dto.DefaultHourlyRate,
        EstimatedLaborAmount = Math.Round(dto.PlannedHours * dto.DefaultHourlyRate, 3),
        Notes = dto.Notes,
        CreatedById = userId,
        CreationDate = DateTime.UtcNow
      };

      context.ProductionStepWorkers.Add(worker);
      await context.SaveChangesAsync();

      return MapToWorkerDto(worker);
    }

    public async Task<bool> UpdateStepWorkerAsync(int workerId, UpdateProductionStepWorkerDto dto, int userId)
    {
      if (dto.PlannedHours < 0) throw new ArgumentException("Les heures prévues ne peuvent pas être négatives.");
      if (dto.DefaultHourlyRate < 0) throw new ArgumentException("Le taux horaire ne peut pas être négatif.");

      var worker = await context.ProductionStepWorkers
        .Include(w => w.ProductionStep)
          .ThenInclude(s => s!.ProductionOrder)
        .FirstOrDefaultAsync(w => w.Id == workerId);

      if (worker == null) return false;

      var order = worker.ProductionStep?.ProductionOrder;
      if (order == null || order.Status == ProductionStatus.Validated || order.Status == ProductionStatus.Cancelled)
      {
        throw new InvalidOperationException("Impossible de modifier une affectation sur un ordre validé ou annulé.");
      }

      worker.PlannedHours = dto.PlannedHours;
      worker.DefaultHourlyRate = dto.DefaultHourlyRate;
      worker.EstimatedLaborAmount = Math.Round(dto.PlannedHours * dto.DefaultHourlyRate, 3);
      worker.Notes = dto.Notes;
      worker.UpdatedById = userId;
      worker.UpdateDate = DateTime.UtcNow;

      await context.SaveChangesAsync();
      return true;
    }

    public async Task<bool> DeleteStepWorkerAsync(int workerId)
    {
      var worker = await context.ProductionStepWorkers
        .Include(w => w.ProductionStep)
          .ThenInclude(s => s!.ProductionOrder)
        .FirstOrDefaultAsync(w => w.Id == workerId);

      if (worker == null) return false;

      var order = worker.ProductionStep?.ProductionOrder;
      if (order == null || order.Status == ProductionStatus.Validated || order.Status == ProductionStatus.Cancelled)
      {
        throw new InvalidOperationException("Impossible de supprimer une affectation sur un ordre validé ou annulé.");
      }

      // Check whether actual work logs exist using a direct query (prevents historical work-log loss)
      bool hasWorkLogs = await context.ProductionStepWorkLogs
        .AnyAsync(wl => wl.StepWorkerId == workerId);

      if (hasWorkLogs)
      {
        throw new InvalidOperationException("Impossible de supprimer une affectation d'ouvrier ayant déjà des sessions de travail enregistrées. Supprimez d'abord les sessions de travail associées.");
      }

      context.ProductionStepWorkers.Remove(worker);
      await context.SaveChangesAsync();

      return true;
    }

    #endregion

    #region Step Work Logs

    public async Task<List<ProductionStepWorkLogDto>> GetStepWorkLogsAsync(int stepId)
    {
      var workLogs = await context.ProductionStepWorkLogs
        .AsNoTracking()
        .Where(w => w.ProductionStepId == stepId)
        .OrderBy(w => w.WorkDate)
        .ThenBy(w => w.Id)
        .ToListAsync();

      return workLogs.Select(MapToWorkLogDto).ToList();
    }

    public async Task<ProductionStepWorkLogDto?> AddStepWorkLogAsync(int stepId, CreateProductionStepWorkLogDto dto, int userId)
    {
      if (dto.ActualHours <= 0)
      {
        throw new ArgumentException("Le nombre d'heures réelles doit être strictement supérieur à zéro.");
      }

      var step = await context.ProductionSteps
        .Include(s => s.ProductionOrder)
        .FirstOrDefaultAsync(s => s.Id == stepId);

      if (step == null) return null;

      var order = step.ProductionOrder;
      if (order == null || order.Status == ProductionStatus.Validated || order.Status == ProductionStatus.Cancelled)
      {
        throw new InvalidOperationException("Impossible d'enregistrer des heures de travail sur un ordre validé ou annulé.");
      }

      if (step.Status == ProductionStepStatus.Cancelled)
      {
        throw new InvalidOperationException("Impossible d'enregistrer des heures de travail sur une étape de fabrication annulée.");
      }

      var worker = await context.ProductionStepWorkers
        .FirstOrDefaultAsync(w => w.Id == dto.StepWorkerId && w.ProductionStepId == stepId);

      if (worker == null)
      {
        throw new ArgumentException("L'affectation de l'ouvrier est introuvable ou n'appartient pas à cette étape.");
      }

      decimal effectiveRate;
      if (dto.HourlyRate.HasValue)
      {
        if (dto.HourlyRate.Value <= 0)
        {
          throw new ArgumentException("Le taux horaire saisi doit être strictement supérieur à zéro.");
        }
        effectiveRate = dto.HourlyRate.Value;
      }
      else
      {
        if (worker.DefaultHourlyRate <= 0)
        {
          throw new ArgumentException("Aucun taux horaire par défaut valide n'est défini pour cet ouvrier.");
        }
        effectiveRate = worker.DefaultHourlyRate;
      }

      var calendarDate = new DateTime(dto.WorkDate.Year, dto.WorkDate.Month, dto.WorkDate.Day, 0, 0, 0, DateTimeKind.Unspecified);
      decimal calculatedLabor = Math.Round(dto.ActualHours * effectiveRate, 3);

      var workLog = new ProductionStepWorkLog
      {
        StepWorkerId = worker.Id,
        ProductionStepId = step.Id,
        PersonId = worker.PersonId,
        EmployeeFullName = worker.EmployeeFullName,
        WorkDate = calendarDate,
        ActualHours = dto.ActualHours,
        HourlyRate = effectiveRate,
        CalculatedLaborAmount = calculatedLabor,
        Notes = dto.Notes,
        CreatedById = userId,
        CreationDate = DateTime.UtcNow
      };

      var transaction = context.Database.CurrentTransaction == null
        ? await context.Database.BeginTransactionAsync()
        : null;

      try
      {
        context.ProductionStepWorkLogs.Add(workLog);
        await context.SaveChangesAsync();

        await RecalculateOrderCostsAsync(step.ProductionOrderId);

        if (transaction != null)
        {
          await transaction.CommitAsync();
        }
      }
      catch
      {
        if (transaction != null)
        {
          await transaction.RollbackAsync();
        }
        throw;
      }
      finally
      {
        if (transaction != null)
        {
          await transaction.DisposeAsync();
        }
      }

      return MapToWorkLogDto(workLog);
    }

    public async Task<bool> UpdateStepWorkLogAsync(int workLogId, UpdateProductionStepWorkLogDto dto, int userId)
    {
      if (dto.ActualHours <= 0)
      {
        throw new ArgumentException("Le nombre d'heures réelles doit être strictement supérieur à zéro.");
      }

      var workLog = await context.ProductionStepWorkLogs
        .Include(w => w.ProductionStep)
          .ThenInclude(s => s!.ProductionOrder)
        .FirstOrDefaultAsync(w => w.Id == workLogId);

      if (workLog == null) return false;

      var order = workLog.ProductionStep?.ProductionOrder;
      if (order == null || order.Status == ProductionStatus.Validated || order.Status == ProductionStatus.Cancelled)
      {
        throw new InvalidOperationException("Impossible de modifier des heures de travail sur un ordre validé ou annulé.");
      }

      if (workLog.ProductionStep?.Status == ProductionStepStatus.Cancelled)
      {
        throw new InvalidOperationException("Impossible de modifier des heures de travail sur une étape de fabrication annulée.");
      }

      decimal effectiveRate = workLog.HourlyRate;
      if (dto.HourlyRate.HasValue)
      {
        if (dto.HourlyRate.Value <= 0)
        {
          throw new ArgumentException("Le taux horaire saisi doit être strictement supérieur à zéro.");
        }
        effectiveRate = dto.HourlyRate.Value;
      }

      var calendarDate = new DateTime(dto.WorkDate.Year, dto.WorkDate.Month, dto.WorkDate.Day, 0, 0, 0, DateTimeKind.Unspecified);

      var transaction = context.Database.CurrentTransaction == null
        ? await context.Database.BeginTransactionAsync()
        : null;

      try
      {
        workLog.WorkDate = calendarDate;
        workLog.ActualHours = dto.ActualHours;
        workLog.HourlyRate = effectiveRate;
        workLog.CalculatedLaborAmount = Math.Round(dto.ActualHours * effectiveRate, 3);
        workLog.Notes = dto.Notes;
        workLog.UpdatedById = userId;
        workLog.UpdateDate = DateTime.UtcNow;

        await context.SaveChangesAsync();

        await RecalculateOrderCostsAsync(workLog.ProductionStep!.ProductionOrderId);

        if (transaction != null)
        {
          await transaction.CommitAsync();
        }
      }
      catch
      {
        if (transaction != null)
        {
          await transaction.RollbackAsync();
        }
        throw;
      }
      finally
      {
        if (transaction != null)
        {
          await transaction.DisposeAsync();
        }
      }

      return true;
    }

    public async Task<bool> DeleteStepWorkLogAsync(int workLogId)
    {
      var workLog = await context.ProductionStepWorkLogs
        .Include(w => w.ProductionStep)
          .ThenInclude(s => s!.ProductionOrder)
        .FirstOrDefaultAsync(w => w.Id == workLogId);

      if (workLog == null) return false;

      var order = workLog.ProductionStep?.ProductionOrder;
      if (order == null || order.Status == ProductionStatus.Validated || order.Status == ProductionStatus.Cancelled)
      {
        throw new InvalidOperationException("Impossible de supprimer des heures de travail sur un ordre validé ou annulé.");
      }

      if (workLog.ProductionStep?.Status == ProductionStepStatus.Cancelled)
      {
        throw new InvalidOperationException("Impossible de supprimer des heures de travail sur une étape de fabrication annulée.");
      }

      int orderId = workLog.ProductionStep!.ProductionOrderId;

      var transaction = context.Database.CurrentTransaction == null
        ? await context.Database.BeginTransactionAsync()
        : null;

      try
      {
        context.ProductionStepWorkLogs.Remove(workLog);
        await context.SaveChangesAsync();

        await RecalculateOrderCostsAsync(orderId);

        if (transaction != null)
        {
          await transaction.CommitAsync();
        }
      }
      catch
      {
        if (transaction != null)
        {
          await transaction.RollbackAsync();
        }
        throw;
      }
      finally
      {
        if (transaction != null)
        {
          await transaction.DisposeAsync();
        }
      }

      return true;
    }

    #endregion

    #region Other Work Entries

    public async Task<List<ProductionOtherWorkEntryDto>> GetOtherWorkEntriesAsync(DateTime? startDate = null, DateTime? endDate = null, int? personId = null)
    {
      var query = context.ProductionOtherWorkEntries
        .AsNoTracking()
        .Where(e => !e.IsDeleted)
        .AsQueryable();

      if (startDate.HasValue)
      {
        var start = new DateTime(startDate.Value.Year, startDate.Value.Month, startDate.Value.Day, 0, 0, 0, DateTimeKind.Unspecified);
        query = query.Where(e => e.WorkDate >= start);
      }

      if (endDate.HasValue)
      {
        var end = new DateTime(endDate.Value.Year, endDate.Value.Month, endDate.Value.Day, 23, 59, 59, DateTimeKind.Unspecified);
        query = query.Where(e => e.WorkDate <= end);
      }

      if (personId.HasValue && personId.Value > 0)
      {
        query = query.Where(e => e.PersonId == personId.Value);
      }

      var entries = await query
        .OrderByDescending(e => e.WorkDate)
        .ThenByDescending(e => e.Id)
        .ToListAsync();

      return entries.Select(MapToOtherWorkDto).ToList();
    }

    public async Task<ProductionOtherWorkEntryDto?> GetOtherWorkEntryByIdAsync(int id)
    {
      var entry = await context.ProductionOtherWorkEntries
        .AsNoTracking()
        .FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted);

      return entry == null ? null : MapToOtherWorkDto(entry);
    }

    public async Task<ProductionOtherWorkEntryDto> CreateOtherWorkEntryAsync(CreateProductionOtherWorkEntryDto dto, int userId)
    {
      if (dto.Hours <= 0) throw new ArgumentException("Le nombre d'heures doit être strictement supérieur à zéro.");
      if (dto.HourlyRate <= 0) throw new ArgumentException("Le taux horaire doit être strictement supérieur à zéro.");
      if (string.IsNullOrWhiteSpace(dto.Description)) throw new ArgumentException("La description est obligatoire.");

      var person = await context.Persons
        .AsNoTracking()
        .FirstOrDefaultAsync(p => p.Id == dto.PersonId && !p.IsDeleted);

      if (person == null)
      {
        throw new ArgumentException($"Employé #{dto.PersonId} introuvable ou inactif.");
      }

      string employeeFullName = !string.IsNullOrWhiteSpace(person.FullName)
        ? person.FullName
        : $"{person.Firstname} {person.Lastname}".Trim();

      var calendarDate = new DateTime(dto.WorkDate.Year, dto.WorkDate.Month, dto.WorkDate.Day, 0, 0, 0, DateTimeKind.Unspecified);
      decimal calculatedAmount = Math.Round(dto.Hours * dto.HourlyRate, 3);

      var entry = new ProductionOtherWorkEntry
      {
        PersonId = dto.PersonId,
        EmployeeFullName = employeeFullName,
        WorkDate = calendarDate,
        Hours = dto.Hours,
        HourlyRate = dto.HourlyRate,
        CalculatedAmount = calculatedAmount,
        Description = dto.Description.Trim(),
        CreatedById = userId,
        CreationDate = DateTime.UtcNow,
        IsDeleted = false
      };

      context.ProductionOtherWorkEntries.Add(entry);
      await context.SaveChangesAsync();

      return MapToOtherWorkDto(entry);
    }

    public async Task<bool> UpdateOtherWorkEntryAsync(int id, UpdateProductionOtherWorkEntryDto dto, int userId)
    {
      if (dto.Hours <= 0) throw new ArgumentException("Le nombre d'heures doit être strictement supérieur à zéro.");
      if (dto.HourlyRate <= 0) throw new ArgumentException("Le taux horaire doit être strictement supérieur à zéro.");
      if (string.IsNullOrWhiteSpace(dto.Description)) throw new ArgumentException("La description est obligatoire.");

      var entry = await context.ProductionOtherWorkEntries
        .FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted);

      if (entry == null) return false;

      var calendarDate = new DateTime(dto.WorkDate.Year, dto.WorkDate.Month, dto.WorkDate.Day, 0, 0, 0, DateTimeKind.Unspecified);

      entry.WorkDate = calendarDate;
      entry.Hours = dto.Hours;
      entry.HourlyRate = dto.HourlyRate;
      entry.CalculatedAmount = Math.Round(dto.Hours * dto.HourlyRate, 3);
      entry.Description = dto.Description.Trim();
      entry.UpdatedById = userId;
      entry.UpdateDate = DateTime.UtcNow;

      await context.SaveChangesAsync();
      return true;
    }

    public async Task<bool> DeleteOtherWorkEntryAsync(int id, int userId)
    {
      var entry = await context.ProductionOtherWorkEntries
        .FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted);

      if (entry == null) return false;

      entry.IsDeleted = true;
      entry.UpdatedById = userId;
      entry.UpdateDate = DateTime.UtcNow;

      await context.SaveChangesAsync();
      return true;
    }

    #endregion

    #region Monthly Employee Payable Summary

    public async Task<MonthlyEmployeePayableSummaryDto> GetMonthlyPayableSummaryAsync(int year, int month)
    {
      if (year < 2000 || year > 2100) throw new ArgumentException("Année invalide.");
      if (month < 1 || month > 12) throw new ArgumentException("Mois invalide (1 à 12).");

      var startDate = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Unspecified);
      var endDate = startDate.AddMonths(1);

      // 1. Manufacturing work logs: exclude work logs from cancelled or soft-deleted orders
      var mfgLogs = await context.ProductionStepWorkLogs
        .AsNoTracking()
        .Include(w => w.ProductionStep)
          .ThenInclude(s => s!.ProductionOrder)
        .Where(w => w.WorkDate >= startDate && w.WorkDate < endDate)
        .Where(w => w.ProductionStep != null 
                 && w.ProductionStep.ProductionOrder != null 
                 && !w.ProductionStep.ProductionOrder.IsDeleted 
                 && w.ProductionStep.ProductionOrder.Status != ProductionStatus.Cancelled)
        .ToListAsync();

      // 2. Other payable work entries: exclude soft-deleted entries
      var otherEntries = await context.ProductionOtherWorkEntries
        .AsNoTracking()
        .Where(e => !e.IsDeleted && e.WorkDate >= startDate && e.WorkDate < endDate)
        .ToListAsync();

      // Group by PersonId
      var allPersonIds = mfgLogs.Select(m => m.PersonId)
        .Union(otherEntries.Select(o => o.PersonId))
        .Distinct()
        .ToList();

      var summary = new MonthlyEmployeePayableSummaryDto
      {
        Year = year,
        Month = month
      };

      foreach (var personId in allPersonIds)
      {
        var personMfg = mfgLogs.Where(m => m.PersonId == personId).ToList();
        var personOther = otherEntries.Where(o => o.PersonId == personId).ToList();

        string fullName = personMfg.FirstOrDefault()?.EmployeeFullName
          ?? personOther.FirstOrDefault()?.EmployeeFullName
          ?? $"Employé #{personId}";

        decimal mfgHours = personMfg.Sum(m => m.ActualHours);
        decimal mfgAmount = personMfg.Sum(m => m.CalculatedLaborAmount);
        decimal otherHours = personOther.Sum(o => o.Hours);
        decimal otherAmount = personOther.Sum(o => o.CalculatedAmount);

        summary.Employees.Add(new EmployeePayableSummaryItemDto
        {
          PersonId = personId,
          EmployeeFullName = fullName,
          ManufacturingHours = mfgHours,
          ManufacturingAmount = mfgAmount,
          OtherHours = otherHours,
          OtherAmount = otherAmount,
          TotalPayableHours = mfgHours + otherHours,
          TotalPayableAmount = mfgAmount + otherAmount
        });
      }

      summary.Employees = summary.Employees.OrderBy(e => e.EmployeeFullName).ToList();
      summary.TotalManufacturingHours = summary.Employees.Sum(e => e.ManufacturingHours);
      summary.TotalManufacturingAmount = summary.Employees.Sum(e => e.ManufacturingAmount);
      summary.TotalOtherHours = summary.Employees.Sum(e => e.OtherHours);
      summary.TotalOtherAmount = summary.Employees.Sum(e => e.OtherAmount);
      summary.TotalPayableHours = summary.TotalManufacturingHours + summary.TotalOtherHours;
      summary.TotalPayableAmount = summary.TotalManufacturingAmount + summary.TotalOtherAmount;

      return summary;
    }

    #endregion

    #region Mapping Helpers

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
        SalesSiteName = o.SalesSite != null
          ? (!string.IsNullOrWhiteSpace(o.SalesSite.Gouvernorate) ? $"{o.SalesSite.Gouvernorate} - {o.SalesSite.Address}" : (o.SalesSite.Address ?? $"Dépôt #{o.SalesSiteId}"))
          : $"Dépôt #{o.SalesSiteId}",
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
        Steps = o.Steps.OrderBy(s => s.StepNumber).Select(MapToStepDto).ToList()
      };
    }

    private static ProductionStepDto MapToStepDto(ProductionStep s)
    {
      decimal actualLabor = s.WorkLogs?.Sum(w => w.CalculatedLaborAmount) ?? 0m;
      decimal manualLabor = s.LaborCost ?? 0m;
      decimal material = s.Inputs?.Sum(i => i.TotalCost ?? 0m) ?? 0m;
      decimal other = s.OtherCost ?? 0m;

      return new ProductionStepDto
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
        EmployeeLaborCost = actualLabor,
        OtherCost = s.OtherCost,
        MaterialCost = material,
        TotalStepCost = manualLabor + actualLabor + other + material,
        OutputMerchandiseId = s.OutputMerchandiseId,
        OutputMerchandiseRef = s.OutputMerchandise?.PackageReference,
        OutputMerchandiseDesignation = s.OutputMerchandise?.Articles?.Description,
        PlannedOutputQuantity = s.PlannedOutputQuantity,
        ActualOutputQuantity = s.ActualOutputQuantity,
        Inputs = s.Inputs?.Select(i => new ProductionInputDto
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
          TotalCost = i.TotalCost,
          AllowNegativStock = i.Merchandise?.AllowNegativStock ?? false
        }).ToList() ?? new List<ProductionInputDto>(),
        Workers = s.Workers?.Select(MapToWorkerDto).ToList() ?? new List<ProductionStepWorkerDto>(),
        WorkLogs = s.WorkLogs?.Select(MapToWorkLogDto).ToList() ?? new List<ProductionStepWorkLogDto>()
      };
    }

    private static ProductionStepWorkerDto MapToWorkerDto(ProductionStepWorker w)
    {
      return new ProductionStepWorkerDto
      {
        Id = w.Id,
        Guid = w.Guid,
        ProductionStepId = w.ProductionStepId,
        PersonId = w.PersonId,
        EmployeeFullName = w.EmployeeFullName,
        PlannedHours = w.PlannedHours,
        DefaultHourlyRate = w.DefaultHourlyRate,
        EstimatedLaborAmount = w.EstimatedLaborAmount,
        Notes = w.Notes,
        CreatedById = w.CreatedById,
        CreationDate = w.CreationDate,
        WorkLogs = w.WorkLogs?.Select(MapToWorkLogDto).ToList() ?? new List<ProductionStepWorkLogDto>()
      };
    }

    private static ProductionStepWorkLogDto MapToWorkLogDto(ProductionStepWorkLog wl)
    {
      return new ProductionStepWorkLogDto
      {
        Id = wl.Id,
        Guid = wl.Guid,
        StepWorkerId = wl.StepWorkerId,
        ProductionStepId = wl.ProductionStepId,
        PersonId = wl.PersonId,
        EmployeeFullName = wl.EmployeeFullName,
        WorkDate = wl.WorkDate,
        ActualHours = wl.ActualHours,
        HourlyRate = wl.HourlyRate,
        CalculatedLaborAmount = wl.CalculatedLaborAmount,
        Notes = wl.Notes,
        CreatedById = wl.CreatedById,
        CreationDate = wl.CreationDate
      };
    }

    private static ProductionOtherWorkEntryDto MapToOtherWorkDto(ProductionOtherWorkEntry e)
    {
      return new ProductionOtherWorkEntryDto
      {
        Id = e.Id,
        Guid = e.Guid,
        PersonId = e.PersonId,
        EmployeeFullName = e.EmployeeFullName,
        WorkDate = e.WorkDate,
        Hours = e.Hours,
        HourlyRate = e.HourlyRate,
        CalculatedAmount = e.CalculatedAmount,
        Description = e.Description,
        CreatedById = e.CreatedById,
        CreationDate = e.CreationDate,
        UpdatedById = e.UpdatedById,
        UpdateDate = e.UpdateDate,
        IsDeleted = e.IsDeleted
      };
    }

    #endregion
  }
}
