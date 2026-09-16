using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using ms.webapp.api.acya.core.Entities.Production;

namespace ms.webapp.api.acya.core.Entities.DTOs.Production
{
  // ── Order DTOs ─────────────────────────────────────────────────────────────

  public class ProductionOrderDto
  {
    public int Id { get; set; }
    public Guid Guid { get; set; }
    public string Reference { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Notes { get; set; }
    public int SalesSiteId { get; set; }
    public string? SalesSiteName { get; set; }
    public ProductionStatus Status { get; set; }
    public DateTime PlannedStartDate { get; set; }
    public DateTime? PlannedEndDate { get; set; }
    public DateTime? ActualStartDate { get; set; }
    public DateTime? ActualEndDate { get; set; }

    public decimal? TotalMaterialCost { get; set; }
    public decimal? TotalLaborCost { get; set; }
    public decimal? TotalOtherCost { get; set; }
    public decimal? TotalProductionCost { get; set; }
    public decimal? UnitProductionCost { get; set; }

    public double PlannedOutputQuantity { get; set; }
    public double? ActualOutputQuantity { get; set; }

    public int CreatedById { get; set; }
    public string? CreatedByName { get; set; }
    public DateTime CreationDate { get; set; }
    public DateTime? UpdateDate { get; set; }

    public List<ProductionStepDto> Steps { get; set; } = new List<ProductionStepDto>();
  }

  public class CreateProductionOrderDto
  {
    public string? Reference { get; set; }
    public string? Description { get; set; }
    public string? Notes { get; set; }

    [Required]
    public int SalesSiteId { get; set; }

    public DateTime PlannedStartDate { get; set; } = DateTime.UtcNow;
    public DateTime? PlannedEndDate { get; set; }

    [Range(0.001, double.MaxValue, ErrorMessage = "Planned output quantity must be greater than zero.")]
    public double PlannedOutputQuantity { get; set; } = 1.0;

    public List<CreateProductionStepDto> Steps { get; set; } = new List<CreateProductionStepDto>();
  }

  public class UpdateProductionOrderDto
  {
    public string? Description { get; set; }
    public string? Notes { get; set; }
    public int SalesSiteId { get; set; }
    public DateTime PlannedStartDate { get; set; }
    public DateTime? PlannedEndDate { get; set; }
    public double PlannedOutputQuantity { get; set; }
  }

  // ── Step DTOs ──────────────────────────────────────────────────────────────

  public class ProductionStepDto
  {
    public int Id { get; set; }
    public Guid Guid { get; set; }
    public int ProductionOrderId { get; set; }
    public int StepNumber { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ProductionStepStatus Status { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }

    public decimal? LaborCost { get; set; }
    public decimal? OtherCost { get; set; }
    public decimal? MaterialCost { get; set; }
    public decimal? TotalStepCost { get; set; }

    public int? OutputMerchandiseId { get; set; }
    public string? OutputMerchandiseRef { get; set; }
    public string? OutputMerchandiseDesignation { get; set; }
    public double PlannedOutputQuantity { get; set; }
    public double? ActualOutputQuantity { get; set; }

    public List<ProductionInputDto> Inputs { get; set; } = new List<ProductionInputDto>();
  }

  public class CreateProductionStepDto
  {
    public int StepNumber { get; set; } = 1;

    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }

    public decimal? LaborCost { get; set; }
    public decimal? OtherCost { get; set; }

    public int? OutputMerchandiseId { get; set; }
    public double PlannedOutputQuantity { get; set; } = 1.0;

    public List<CreateProductionInputDto> Inputs { get; set; } = new List<CreateProductionInputDto>();
  }

  public class UpdateProductionStepDto
  {
    [Required]
    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }
    public int StepNumber { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public decimal? LaborCost { get; set; }
    public decimal? OtherCost { get; set; }
    public int? OutputMerchandiseId { get; set; }
    public double PlannedOutputQuantity { get; set; }
    public double? ActualOutputQuantity { get; set; }
  }

  // ── Input DTOs ─────────────────────────────────────────────────────────────

  public class ProductionInputDto
  {
    public int Id { get; set; }
    public Guid Guid { get; set; }
    public int ProductionStepId { get; set; }
    public int MerchandiseId { get; set; }
    public string? MerchandiseRef { get; set; }
    public string? MerchandiseDesignation { get; set; }
    public string? Unit { get; set; }

    public double PlannedQuantity { get; set; }
    public double? ActualQuantity { get; set; }

    public decimal? UnitCost { get; set; }
    public decimal? TotalCost { get; set; }

    public double? CurrentStockQuantity { get; set; }
  }

  public class CreateProductionInputDto
  {
    [Required]
    public int MerchandiseId { get; set; }

    [Range(0.0001, double.MaxValue, ErrorMessage = "Quantity must be greater than zero.")]
    public double PlannedQuantity { get; set; } = 1.0;

    public decimal? UnitCost { get; set; }
  }

  // ── Action / Lifecycle DTOs ────────────────────────────────────────────────

  /// <summary>
  /// Payload when marking a step as Completed, providing the actual consumption & output quantities (Q2 decision).
  /// </summary>
  public class CompleteStepDto
  {
    public double? ActualOutputQuantity { get; set; }
    public decimal? LaborCost { get; set; }
    public decimal? OtherCost { get; set; }
    public List<StepInputActualDto> Inputs { get; set; } = new List<StepInputActualDto>();
  }

  public class StepInputActualDto
  {
    public int InputId { get; set; }
    public double ActualQuantity { get; set; }
    public decimal? UnitCost { get; set; }
  }

  /// <summary>
  /// Payload for on-the-fly creation of intermediate or final output Merchandise (Q3 decision).
  /// </summary>
  public class QuickCreateMerchandiseDto
  {
    [Required]
    public int ArticleId { get; set; }

    public string? PackageReference { get; set; }
    public string? Description { get; set; }
    public bool IsInvoicible { get; set; } = true;
    public bool AllowNegativStock { get; set; } = false;
  }
}
