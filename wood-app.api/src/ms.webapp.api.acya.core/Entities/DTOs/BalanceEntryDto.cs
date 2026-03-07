using System;

namespace ms.webapp.api.acya.core.Entities.DTOs
{
    public class BalanceEntryDto
    {
        public int Id { get; set; }          // counterpart id
        public string Label { get; set; }    // fullname
        public decimal ClosingBalance { get; set; }
        public string LastTransaction { get; set; }      // "payment" | "mouvement"
        public DateTime? DateOfLastTransaction { get; set; }
    }
}
