using System.Collections.Generic;
using System.Threading.Tasks;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.core.Integrations.Qwerty.Interfaces
{
    public interface IQwertyDataProvider
    {
        /// <summary>
        /// Retrieves sales invoices and credit notes for the given fiscal period.
        /// </summary>
        Task<List<Document>> GetSalesDocumentsAsync(int year, int month);

        /// <summary>
        /// Retrieves purchase invoices and supplier credit notes for the given fiscal period.
        /// </summary>
        Task<List<Document>> GetPurchaseDocumentsAsync(int year, int month);

        /// <summary>
        /// Retrieves bank transactions for a target bank account and period.
        /// </summary>
        Task<List<BankTransaction>> GetBankTransactionsAsync(int? bankId, int year, int month);

        /// <summary>
        /// Retrieves cash movements for a target sales site / caisse and period.
        /// </summary>
        Task<List<CaisseMovement>> GetCaisseMovementsAsync(int? siteId, int year, int month);

        /// <summary>
        /// Retrieves withholding taxes (RS) for the given fiscal period.
        /// </summary>
        Task<List<HoldingTax>> GetHoldingTaxesAsync(int year, int month);
    }
}
