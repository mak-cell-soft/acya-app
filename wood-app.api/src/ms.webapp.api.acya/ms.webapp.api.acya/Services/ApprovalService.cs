using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure;

namespace ms.webapp.api.acya.api.Services
{
    public class ApprovalService : IApprovalService
    {
        private readonly WoodAppContext _context;
        private readonly IAppNotificationService _notificationService;

        public ApprovalService(WoodAppContext context, IAppNotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        public async Task<bool> RequiresApprovalAsync(int enterpriseId, decimal totalAmount)
        {
            var config = await _context.ApprovalConfigs
                .FirstOrDefaultAsync(x => x.EnterpriseId == enterpriseId);

            if (config == null || !config.ThresholdAmount.HasValue)
                return false;

            return totalAmount > config.ThresholdAmount.Value;
        }

        public async Task<DocumentApproval> SubmitForApprovalAsync(int documentId, int submittedByUserId)
        {
            var doc = await _context.Documents
                .Include(d => d.CounterPart)
                .Include(d => d.AppUsers)
                .FirstOrDefaultAsync(d => d.Id == documentId);

            if (doc == null) throw new Exception("Document not found");

            // Prevent duplicate pending approvals for the same document
            var existingApproval = await _context.DocumentApprovals
                .FirstOrDefaultAsync(a => a.DocumentId == documentId && a.Decision == ApprovalDecision.Pending);

            if (existingApproval != null)
                return existingApproval;

            // Create Approval Entry
            var approval = new DocumentApproval
            {
                DocumentId = documentId,
                SubmittedByUserId = submittedByUserId,
                Decision = ApprovalDecision.Pending,
                SubmittedAt = DateTime.UtcNow
            };

            _context.DocumentApprovals.Add(approval);

            // Update Document Status
            doc.DocStatus = DocStatus.PendingApproval;

            await _context.SaveChangesAsync();

            // Notify Admins
            int entId = doc.AppUsers?.EnterpriseId ?? 0;
            var config = await _context.ApprovalConfigs
                .FirstOrDefaultAsync(x => x.EnterpriseId == entId);

            string title = "Nouvelle demande d'approbation";
            string message = $"Document {doc.DocNumber} pour {doc.CounterPart?.Name} ({doc.TotalCostNetTTCDoc:N3} TND) nécessite votre approbation.";

            // Notify Approvers (Roles)
            var approverRoles = new List<string> { "Admin", "SuperAdmin" };
            if (config != null && !string.IsNullOrEmpty(config.ApproverRoles))
            {
                var customRoles = config.ApproverRoles.Split(',', StringSplitOptions.RemoveEmptyEntries);
                if (customRoles.Length > 0)
                {
                    approverRoles = customRoles.Select(r => r.Trim()).ToList();
                }
            }

            foreach (var role in approverRoles)
            {
                await _notificationService.NotifyAsync(
                    title: title,
                    message: message,
                    type: NotificationType.Warning,
                    targetRole: role,
                    relatedEntityId: doc.Id.ToString(),
                    relatedEntityType: "Document"
                );
            }

            // Send Emails if configured
            if (config != null && !string.IsNullOrEmpty(config.ApproverEmails))
            {
                var emails = config.ApproverEmails.Split(',', StringSplitOptions.RemoveEmptyEntries);
                foreach (var email in emails)
                {
                    await _notificationService.SendEmailNotificationAsync(
                        to: email.Trim(),
                        subject: title,
                        body: BuildApprovalEmailBody(doc, message)
                    );
                }
            }

            return approval;
        }

        public async Task<DocumentApproval> ProcessDecisionAsync(int documentId, ApprovalDecision decision, int decidedByUserId, string? rejectionReason)
        {
            var approval = await _context.DocumentApprovals
                .Where(x => x.DocumentId == documentId && x.Decision == ApprovalDecision.Pending)
                .OrderByDescending(x => x.SubmittedAt)
                .FirstOrDefaultAsync();

            if (approval == null) throw new Exception("Pending approval not found for this document");

            var doc = await _context.Documents.FindAsync(documentId);
            if (doc == null) throw new Exception("Document not found");

            approval.Decision = decision;
            approval.DecidedByUserId = decidedByUserId;
            approval.DecidedAt = DateTime.UtcNow;
            approval.RejectionReason = rejectionReason;

            if (decision == ApprovalDecision.Approved)
            {
                doc.DocStatus = DocStatus.Approved;
            }
            else if (decision == ApprovalDecision.Rejected)
            {
                doc.DocStatus = DocStatus.Rejected;
                if (string.IsNullOrEmpty(rejectionReason))
                    throw new Exception("Le motif de rejet est obligatoire.");
            }

            await _context.SaveChangesAsync();

            // Notify Submitter
            string title = decision == ApprovalDecision.Approved ? "Document Approuvé" : "Document Rejeté";
            string message = $"Votre document {doc.DocNumber} a été {(decision == ApprovalDecision.Approved ? "approuvé" : "rejeté")}.";
            if (decision == ApprovalDecision.Rejected) message += $" Motif : {rejectionReason}";

            await _notificationService.NotifyAsync(
                title: title,
                message: message,
                type: decision == ApprovalDecision.Approved ? NotificationType.Success : NotificationType.Alert,
                targetUserId: approval.SubmittedByUserId,
                relatedEntityId: doc.Id.ToString(),
                relatedEntityType: "Document"
            );

            return approval;
        }

        public async Task<ApprovalConfig?> GetConfigAsync(int enterpriseId)
        {
            return await _context.ApprovalConfigs
                .FirstOrDefaultAsync(x => x.EnterpriseId == enterpriseId);
        }

        public async Task<ApprovalConfig> SaveConfigAsync(ApprovalConfigDto dto)
        {
            var config = await _context.ApprovalConfigs
                .FirstOrDefaultAsync(x => x.EnterpriseId == dto.enterpriseId);

            if (config == null)
            {
                config = new ApprovalConfig
                {
                    EnterpriseId = dto.enterpriseId,
                    CreatedAt = DateTime.UtcNow
                };
                _context.ApprovalConfigs.Add(config);
            }

            config.ThresholdAmount = dto.thresholdAmount;
            config.ApproverEmails = dto.approverEmails;
            config.ApproverRoles = dto.approverRoles;
            config.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return config;
        }

        public async Task<IEnumerable<DocumentApproval>> GetPendingApprovalsAsync(int enterpriseId)
        {
            var approvals = await _context.DocumentApprovals
                .Include(a => a.Document)
                    .ThenInclude(d => d!.CounterPart)
                .Include(a => a.Document)
                    .ThenInclude(d => d!.DocumentMerchandises)
                        .ThenInclude(dm => dm.Merchandise)
                            .ThenInclude(m => m!.Articles)
                .Include(a => a.Document)
                    .ThenInclude(d => d!.DocumentMerchandises)
                        .ThenInclude(dm => dm.QuantityMovements)
                            .ThenInclude(qm => qm!.ListOfLengths)
                                .ThenInclude(ll => ll.AppVarLength)
                .Include(a => a.SubmittedBy)
                    .ThenInclude(u => u!.Persons)
                .Where(a => a.Decision == ApprovalDecision.Pending && a.Document!.AppUsers!.EnterpriseId == enterpriseId)
                .OrderByDescending(a => a.SubmittedAt)
                .AsSplitQuery()
                .ToListAsync();

            return approvals.Distinct();
        }

        public async Task<IEnumerable<DocumentApproval>> GetHistoryAsync(int documentId)
        {
            var history = await _context.DocumentApprovals
                .Include(a => a.DecidedBy)
                    .ThenInclude(u => u!.Persons)
                .Where(a => a.DocumentId == documentId)
                .OrderByDescending(a => a.SubmittedAt)
                .ToListAsync();

            return history.Distinct();
        }

        private string BuildApprovalEmailBody(Document doc, string message)
        {
            return $@"
                <div style='font-family: sans-serif; padding: 20px; color: #333;'>
                    <h2 style='color: #2c3e50;'>Demande d'approbation</h2>
                    <p>{message}</p>
                    <hr/>
                    <p><strong>Référence :</strong> {doc.DocNumber}</p>
                    <p><strong>Date :</strong> {doc.CreationDate:dd/MM/yyyy}</p>
                    <p><strong>Montant Total :</strong> {doc.TotalCostNetTTCDoc:N3} TND</p>
                    <br/>
                    <a href='https://acya.app/merchandise/approvals/pending' 
                       style='background: #27ae60; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>
                       Voir la demande
                    </a>
                </div>";
        }
    }
}
