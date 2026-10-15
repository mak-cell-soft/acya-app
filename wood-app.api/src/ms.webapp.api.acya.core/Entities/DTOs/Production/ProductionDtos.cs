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
    public decimal? EmployeeLaborCost { get; set; }
    public decimal? OtherCost { get; set; }
    public decimal? MaterialCost { get; set; }
    public decimal? TotalStepCost { get; set; }

    public int? OutputMerchandiseId { get; set; }
    public string? OutputMerchandiseRef { get; set; }
    public string? OutputMerchandiseDesignation { get; set; }
    public double PlannedOutputQuantity { get; set; }
    public double? ActualOutputQuantity { get; set; }

    public List<ProductionInputDto> Inputs { get; set; } = new List<ProductionInputDto>();
    public List<ProductionStepWorkerDto> Workers { get; set; } = new List<ProductionStepWorkerDto>();
    public List<ProductionStepWorkLogDto> WorkLogs { get; set; } = new List<ProductionStepWorkLogDto>();
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
    public bool AllowNegativStock { get; set; }
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

  // ── Step Worker DTOs ───────────────────────────────────────────────────────

  public class ProductionStepWorkerDto
  {
    public int Id { get; set; }
    public Guid Guid { get; set; }
    public int ProductionStepId { get; set; }
    public int PersonId { get; set; }
    public string EmployeeFullName { get; set; } = string.Empty;
    public decimal PlannedHours { get; set; }
    public decimal DefaultHourlyRate { get; set; }
    public decimal EstimatedLaborAmount { get; set; }
    public string? Notes { get; set; }
    public int CreatedById { get; set; }
    public DateTime CreationDate { get; set; }
    public List<ProductionStepWorkLogDto> WorkLogs { get; set; } = new List<ProductionStepWorkLogDto>();
  }

  public class CreateProductionStepWorkerDto
  {
    [Required]
    public int PersonId { get; set; }

    [Range(0, 100000, ErrorMessage = "Les heures prévues doivent être supérieures ou égales à zéro.")]
    public decimal PlannedHours { get; set; } = 0m;

    [Range(0, 100000, ErrorMessage = "Le taux horaire par défaut doit être supérieur ou égal à zéro.")]
    public decimal DefaultHourlyRate { get; set; } = 0m;

    public string? Notes { get; set; }
  }

  public class UpdateProductionStepWorkerDto
  {
    [Range(0, 100000, ErrorMessage = "Les heures prévues doivent être supérieures ou égales à zéro.")]
    public decimal PlannedHours { get; set; } = 0m;

    [Range(0, 100000, ErrorMessage = "Le taux horaire par défaut doit être supérieur ou égal à zéro.")]
    public decimal DefaultHourlyRate { get; set; } = 0m;

    public string? Notes { get; set; }
  }

  // ── Work Log DTOs ──────────────────────────────────────────────────────────

  public class ProductionStepWorkLogDto
  {
    public int Id { get; set; }
    public Guid Guid { get; set; }
    public int StepWorkerId { get; set; }
    public int ProductionStepId { get; set; }
    public int PersonId { get; set; }
    public string EmployeeFullName { get; set; } = string.Empty;
    public DateTime WorkDate { get; set; }
    public decimal ActualHours { get; set; }
    public decimal HourlyRate { get; set; }
    public decimal CalculatedLaborAmount { get; set; }
    public string? Notes { get; set; }
    public int CreatedById { get; set; }
    public DateTime CreationDate { get; set; }
  }

  public class CreateProductionStepWorkLogDto
  {
    [Required]
    public int StepWorkerId { get; set; }

    [Required]
    public DateTime WorkDate { get; set; }

    [Range(0.001, 1000, ErrorMessage = "Les heures effectives doivent être strictement supérieures à zéro.")]
    public decimal ActualHours { get; set; }

    /// <summary>
    /// Explicit hourly rate snapshot. If null, server defaults to assignment's DefaultHourlyRate.
    /// </summary>
    public decimal? HourlyRate { get; set; }

    public string? Notes { get; set; }
  }

  public class UpdateProductionStepWorkLogDto
  {
    [Required]
    public DateTime WorkDate { get; set; }

    [Range(0.001, 1000, ErrorMessage = "Les heures effectives doivent être strictement supérieures à zéro.")]
    public decimal ActualHours { get; set; }

    /// <summary>
    /// Explicit hourly rate snapshot. If null, preserves existing work log rate.
    /// </summary>
    public decimal? HourlyRate { get; set; }

    public string? Notes { get; set; }
  }

  // ── Production Other Work Entry DTOs ───────────────────────────────────────

  public class ProductionOtherWorkEntryDto
  {
    public int Id { get; set; }
    public Guid Guid { get; set; }
    public int PersonId { get; set; }
    public string EmployeeFullName { get; set; } = string.Empty;
    public DateTime WorkDate { get; set; }
    public decimal Hours { get; set; }
    public decimal HourlyRate { get; set; }
    public decimal CalculatedAmount { get; set; }
    public string Description { get; set; } = string.Empty;
    public int CreatedById { get; set; }
    public DateTime CreationDate { get; set; }
    public int? UpdatedById { get; set; }
    public DateTime? UpdateDate { get; set; }
    public bool IsDeleted { get; set; }
  }

  public class CreateProductionOtherWorkEntryDto
  {
    [Required]
    public int PersonId { get; set; }

    [Required]
    public DateTime WorkDate { get; set; }

    [Range(0.001, 1000, ErrorMessage = "Le nombre d'heures doit être strictement supérieur à zéro.")]
    public decimal Hours { get; set; }

    [Range(0.001, 100000, ErrorMessage = "Le taux horaire doit être strictement supérieur à zéro.")]
    public decimal HourlyRate { get; set; }

    [Required]
    [MaxLength(500, ErrorMessage = "La description ne doit pas dépasser 500 caractères.")]
    public string Description { get; set; } = string.Empty;
  }

  public class UpdateProductionOtherWorkEntryDto
  {
    [Required]
    public DateTime WorkDate { get; set; }

    [Range(0.001, 1000, ErrorMessage = "Le nombre d'heures doit être strictement supérieur à zéro.")]
    public decimal Hours { get; set; }

    [Range(0.001, 100000, ErrorMessage = "Le taux horaire doit être strictement supérieur à zéro.")]
    public decimal HourlyRate { get; set; }

    [Required]
    [MaxLength(500, ErrorMessage = "La description ne doit pas dépasser 500 caractères.")]
    public string Description { get; set; } = string.Empty;
  }

  // ── Monthly Employee Payable Summary DTOs ──────────────────────────────────

  public class MonthlyEmployeePayableSummaryDto
  {
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal TotalManufacturingHours { get; set; }
    public decimal TotalManufacturingAmount { get; set; }
    public decimal TotalOtherHours { get; set; }
    public decimal TotalOtherAmount { get; set; }
    public decimal TotalPayableHours { get; set; }
    public decimal TotalPayableAmount { get; set; }
    public List<EmployeePayableSummaryItemDto> Employees { get; set; } = new List<EmployeePayableSummaryItemDto>();
  }

  public class EmployeePayableSummaryItemDto
  {
    public int PersonId { get; set; }
    public string EmployeeFullName { get; set; } = string.Empty;
    public decimal ManufacturingHours { get; set; }
    public decimal ManufacturingAmount { get; set; }
    public decimal OtherHours { get; set; }
    public decimal OtherAmount { get; set; }
    public decimal TotalPayableHours { get; set; }
    public decimal TotalPayableAmount { get; set; }
  }
}
