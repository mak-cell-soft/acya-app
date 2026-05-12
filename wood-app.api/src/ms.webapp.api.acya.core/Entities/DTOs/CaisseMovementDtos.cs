using System;

namespace ms.webapp.api.acya.core.Entities.DTOs
{
    public class CaisseMovementDto
    {
        public int Id { get; set; }
        public int SalesSiteId { get; set; }
        public string? SalesSiteName { get; set; }
        public DateTime MovementDate { get; set; }
        public string Type { get; set; } = "ENTREE";
        public string Reason { get; set; } = "ENCAISSEMENT";
        public decimal Amount { get; set; }
        public string? Reference { get; set; }
        public string? Notes { get; set; }
        public int? BankDepositId { get; set; }
        public int? PaymentId { get; set; }   // null = mouvement manuel (supprimable)
        public DateTime? CreatedAt { get; set; }
    }

    public class CaisseBalanceDto
    {
        public int SalesSiteId { get; set; }
        public string? SalesSiteName { get; set; }
        public decimal TotalEntrees { get; set; }
        public decimal TotalSorties { get; set; }
        public decimal CurrentBalance { get; set; }
        public DateTime? LastMovementDate { get; set; }
    }

    public class CreateCaisseMovementDto
    {
        public int SalesSiteId { get; set; }
        public string Type { get; set; } = "ENTREE";
        public string Reason { get; set; } = "ENCAISSEMENT";
        public decimal Amount { get; set; }
        public string? Reference { get; set; }
        public string? Notes { get; set; }
        public int? CreatedByUserId { get; set; }
    }
}
