using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities.DTOs.Authentication;
using System;

namespace ms.webapp.api.acya.core.Entities.DTOs
{
    public class DocumentApprovalDto
    {
        public int id { get; set; }
        public int documentId { get; set; }
        public DocumentDto? document { get; set; }
        public int submittedByUserId { get; set; }
        public AppUserDto? submittedBy { get; set; }
        public int? decidedByUserId { get; set; }
        public AppUserDto? decidedBy { get; set; }
        public ApprovalDecision decision { get; set; }
        public string? rejectionReason { get; set; }
        public DateTime submittedAt { get; set; }
        public DateTime? decidedAt { get; set; }
    }
}
