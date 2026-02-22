using System;
using System.Collections.Generic;

namespace ms.webapp.api.acya.core.Entities.DTOs
{
    public class AccountStatementDto
    {
        public int CounterPartId { get; set; }
        public string? CounterPartName { get; set; }
        public decimal OpeningBalance { get; set; }
        public decimal BalanceBeforePeriod { get; set; }
        public List<LedgerEntryDto> Transactions { get; set; } = new List<LedgerEntryDto>();
        public decimal TotalDebit { get; set; }
        public decimal TotalCredit { get; set; }
        public decimal ClosingBalance { get; set; }
    }

    public class LedgerEntryDto
    {
        public int Id { get; set; }
        public DateTime TransactionDate { get; set; }
        public string Type { get; set; } = string.Empty;
        public int? RelatedId { get; set; }
        public decimal Debit { get; set; }
        public decimal Credit { get; set; }
        public string? Description { get; set; }
        public decimal RunningBalance { get; set; }
    }
}
