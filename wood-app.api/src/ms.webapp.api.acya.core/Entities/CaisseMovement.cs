using System;
using ms.webapp.api.acya.core.Interfaces;

namespace ms.webapp.api.acya.core.Entities
{
    public class CaisseMovement : IEntity, IAuditable
    {
        public int Id { get; set; }
        public int SalesSiteId { get; set; }
        public SalesSite? SalesSite { get; set; }
        public DateTime MovementDate { get; set; }
        public string Type { get; set; } = "ENTREE"; // ENTREE | SORTIE
        public string Reason { get; set; } = "ENCAISSEMENT"; // ENCAISSEMENT | VERSEMENT_BANQUE | DEPENSE | INIT | RECTIFICATION
        public decimal Amount { get; set; }
        public string? Reference { get; set; }
        public string? Notes { get; set; }
        public int? BankDepositId { get; set; }
        public BankDeposit? BankDeposit { get; set; }
        public int? PaymentId { get; set; }
        public Payment? Payment { get; set; }

        public DateTime? CreatedAt { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public int? CreatedByUserId { get; set; }
        public bool IsDeleted { get; set; }

        public CaisseMovement()
        {
            CreatedAt = DateTime.UtcNow;
            IsDeleted = false;
        }
    }
}
