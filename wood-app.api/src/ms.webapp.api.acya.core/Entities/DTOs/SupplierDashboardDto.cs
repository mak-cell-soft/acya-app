using System.Collections.Generic;

namespace ms.webapp.api.acya.core.Entities.DTOs
{
    public class SupplierDashboardDto
    {
        public decimal CurrentBalance { get; set; }
        public decimal TotalPaid { get; set; }
        public List<DocumentDto> PendingOrders { get; set; } = new List<DocumentDto>();
        public List<DocumentDto> PendingReceipts { get; set; } = new List<DocumentDto>();
        public List<LedgerEntryDto> RecentTransactions { get; set; } = new List<LedgerEntryDto>();
    }
}
