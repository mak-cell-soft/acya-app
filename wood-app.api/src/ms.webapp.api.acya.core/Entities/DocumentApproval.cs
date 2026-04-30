using System;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Interfaces;

namespace ms.webapp.api.acya.core.Entities
{
    public class DocumentApproval : IEntity
    {
        public int Id { get; set; }

        public int DocumentId { get; set; }
        public Document? Document { get; set; }

        // Utilisateur qui a soumis le document
        public int SubmittedByUserId { get; set; }
        public AppUser? SubmittedBy { get; set; }

        // Utilisateur qui a pris la décision (null si encore en attente)
        public int? DecidedByUserId { get; set; }
        public AppUser? DecidedBy { get; set; }

        public ApprovalDecision Decision { get; set; } = ApprovalDecision.Pending;
        
        // Motif de rejet (obligatoire si Decision == Rejected)
        public string? RejectionReason { get; set; }

        public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
        public DateTime? DecidedAt { get; set; }
    }
}
