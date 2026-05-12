namespace ms.webapp.api.acya.core.Entities.DTOs
{
    public class BankBalanceDto
    {
        public int BankId { get; set; }
        public string? BankName { get; set; }
        public string? Rib { get; set; }
        public decimal InitialBalance { get; set; }
        public decimal TotalDeposits { get; set; }
        public decimal TotalFees { get; set; }
        public decimal CurrentBalance { get; set; }
    }
}
