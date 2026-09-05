using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using ms.webapp.api.acya.core.Entities.Chantier;
using ms.webapp.api.acya.core.Entities.DTOs.Chantier;

namespace ms.webapp.api.acya.core.Interfaces
{
  /// <summary>
  /// Domain repository abstraction for Chantier aggregate and its sub-entities.
  /// </summary>
  public interface IChantierRepository
  {
    // Chantier CRUD & List
    Task<List<ChantierListItemDto>> GetAllAsync(ChantierStatus? status = null, ChantierFlag? healthFlag = null, string? search = null);
    Task<ChantierDetailDto?> GetDetailByIdAsync(int id);
    Task<Entities.Chantier.Chantier?> GetEntityByIdAsync(int id);
    Task<Entities.Chantier.Chantier> CreateAsync(CreateChantierDto dto, int userId);
    Task<bool> UpdateAsync(int id, UpdateChantierDto dto, int userId);
    Task<bool> UpdateStatusAsync(int id, UpdateChantierStatusDto dto, int userId);
    Task<bool> UpdateProgressAsync(int id, int progressPct, int userId);
    Task<bool> SoftDeleteAsync(int id, int userId);

    // Team Members
    Task<List<ChantierTeamMemberDto>> GetTeamMembersAsync(int chantierId);
    Task<ChantierTeamMemberDto?> AssignTeamMemberAsync(int chantierId, AssignTeamMemberDto dto, int userId);
    Task<bool> ReleaseTeamMemberAsync(int chantierId, int memberId, int userId);

    // Production (Phases & Tasks)
    Task<List<ChantierPhaseDto>> GetPhasesAsync(int chantierId);
    Task<ChantierPhaseDto?> CreatePhaseAsync(int chantierId, CreateChantierPhaseDto dto);
    Task<bool> DeletePhaseAsync(int phaseId);
    Task<ChantierTaskDto?> CreateTaskAsync(int phaseId, CreateChantierTaskDto dto);
    Task<bool> UpdateTaskStatusAsync(int taskId, UpdateTaskStatusDto dto);
    Task<bool> DeleteTaskAsync(int taskId);

    // Materials (Option C dedicated ledger)
    Task<List<ChantierMaterialRequirementDto>> GetMaterialRequirementsAsync(int chantierId);
    Task<ChantierMaterialRequirementDto?> AddMaterialRequirementAsync(int chantierId, CreateMaterialRequirementDto dto);
    Task<bool> DeleteMaterialRequirementAsync(int requirementId);
    Task<List<ChantierMaterialConsumptionDto>> GetMaterialConsumptionsAsync(int chantierId);
    Task<ChantierMaterialConsumptionDto?> LogMaterialConsumptionAsync(int chantierId, LogMaterialConsumptionDto dto, int userId);

    // Suivi & Alerts
    Task<List<ChantierProgressEntryDto>> GetProgressEntriesAsync(int chantierId);
    Task<ChantierProgressEntryDto?> AddProgressEntryAsync(int chantierId, CreateProgressEntryDto dto, int userId);
    Task<List<ChantierAlertDto>> GetAlertsAsync(int chantierId);
    Task<ChantierAlertDto?> AddAlertAsync(int chantierId, CreateChantierAlertDto dto);
    Task<bool> ResolveAlertAsync(int alertId);

    // Vehicles (Magasin)
    Task<List<ChantierVehicleAssignmentDto>> GetVehicleAssignmentsAsync(int chantierId);
    Task<ChantierVehicleAssignmentDto?> AssignVehicleAsync(int chantierId, AssignChantierVehicleDto dto);
    Task<bool> ReleaseVehicleAssignmentAsync(int assignmentId);

    // Caisse (Petty cash / Alimentation / Sorties / Mobile requests)
    Task<ChantierCaisseSummaryDto> GetCaisseSummaryAsync(int chantierId, int? userId = null, bool isAdmin = true);
    Task<List<ChantierCaisseTransactionDto>> GetCaisseTransactionsAsync(int chantierId, ChantierCaisseTransactionType? type = null, ChantierCaisseTransactionStatus? status = null, int? userId = null, bool isAdmin = true);
    Task<ChantierCaisseTransactionDto?> AddCaisseAlimentationAsync(int chantierId, CreateChantierCaisseAlimentationDto dto, int userId);
    Task<ChantierCaisseTransactionDto?> AddCaisseSortieAsync(int chantierId, CreateChantierCaisseSortieDto dto, int userId);
    Task<ChantierCaisseTransactionDto?> ValidateCaisseRequestAsync(int chantierId, int transactionId, bool approve, int userId);
    Task<bool> DeleteCaisseTransactionAsync(int transactionId, int userId);

    // Statistics / KPIs
    Task<ChantierStatisticsDto> GetStatisticsAsync(int chantierId);
  }
}
