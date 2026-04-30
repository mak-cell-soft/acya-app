using System;
using ms.webapp.api.acya.core.Interfaces;

namespace ms.webapp.api.acya.core.Entities
{
    public class ApprovalConfig : IEntity
    {
        public int Id { get; set; }
        
        public int EnterpriseId { get; set; }
        public Enterprise? Enterprise { get; set; }

        // Seuil en devise locale. NULL = approbation désactivée
        public decimal? ThresholdAmount { get; set; }

        // Email(s) des approbateurs (peut être JSON array ou CSV)
        public string? ApproverEmails { get; set; }

        // Liste des rôles autorisés à approuver (JSON : ["Admin"])
        public string? ApproverRoles { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
