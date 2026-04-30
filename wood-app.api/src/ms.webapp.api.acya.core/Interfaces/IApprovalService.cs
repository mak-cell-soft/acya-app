using System.Collections.Generic;
using System.Threading.Tasks;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;

namespace ms.webapp.api.acya.core.Interfaces
{
    public interface IApprovalService
    {
        Task<bool> RequiresApprovalAsync(int enterpriseId, decimal totalAmount);
        Task<DocumentApproval> SubmitForApprovalAsync(int documentId, int submittedByUserId);
        Task<DocumentApproval> ProcessDecisionAsync(int documentId, ApprovalDecision decision, int decidedByUserId, string? rejectionReason);
        Task<ApprovalConfig?> GetConfigAsync(int enterpriseId);
        Task<ApprovalConfig> SaveConfigAsync(ApprovalConfigDto dto);
        Task<IEnumerable<DocumentApproval>> GetPendingApprovalsAsync(int enterpriseId);
        Task<IEnumerable<DocumentApproval>> GetHistoryAsync(int documentId);
    }
}
