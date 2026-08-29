using System.Collections.Generic;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Integrations.Qwerty.DTOs;

namespace ms.webapp.api.acya.core.Integrations.Qwerty.Interfaces
{
    public interface IQwertyDataMapper
    {
        /// <summary>
        /// Maps sales documents to Qwerty operations (vente).
        /// </summary>
        List<QwertyOperationDto> MapSalesDocuments(IEnumerable<Document> documents);

        /// <summary>
        /// Maps purchase documents to Qwerty operations (achat).
        /// </summary>
        List<QwertyOperationDto> MapPurchaseDocuments(IEnumerable<Document> documents);

        /// <summary>
        /// Maps bank transactions to Qwerty operations (banque).
        /// </summary>
        List<QwertyOperationDto> MapBankTransactions(IEnumerable<BankTransaction> transactions);

        /// <summary>
        /// Maps caisse movements to Qwerty operations (caisse).
        /// </summary>
        List<QwertyOperationDto> MapCaisseMovements(IEnumerable<CaisseMovement> movements);

        /// <summary>
        /// Maps holding taxes (RS) to Qwerty operations (rs / retenue).
        /// </summary>
        List<QwertyOperationDto> MapHoldingTaxes(IEnumerable<HoldingTax> holdingTaxes);
    }
}
