using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ms.webapp.api.acya.common
{
  public static class Helpers
  {
    public static string CapitalizeFirstLetter(string? value)
    {
      if (string.IsNullOrWhiteSpace(value))
      {
        return value!;
      }
      return char.ToUpper(value[0]) + value.Substring(1).ToLower();
    }

    public static string GetPrefixForDocumentType(DocumentTypes type)
    {
      return type switch
      {
        DocumentTypes.supplierOrder => "SO", // Bon de commande Fournisseur
        DocumentTypes.supplierReceipt => "SR", // Bon de réception Fournisseur
        DocumentTypes.supplierInvoice => "FF", // Facture Fournisseur
        DocumentTypes.customerOrder => "CO", // Bon de commande Client
        DocumentTypes.customerDeliveryNote => "BL", // Bon de livraison Client
        DocumentTypes.customerInvoice => "FC", // Facture Client
        DocumentTypes.stockTransfer => "TS", // Transfert Stock
        _ => string.Empty
      };
    }

    /**
    * Here is a Doc number with the Year added in the prefix 2.0
    * The incremetal number changes (reset to 0) if year changes.
    */
    public static string GenerateNewDocNumber(string prefix, string? lastDocNumber)
    {
      string yearSuffix = DateTime.Now.ToString("yy"); // Get the last two digits of the current year
      int newIncrement = 1;

      if (!string.IsNullOrEmpty(lastDocNumber))
      {
        // Extract the year suffix from the lastDocNumber
        string lastYearSuffix = lastDocNumber.Substring(prefix.Length + 1, 2); // +1 to skip the hyphen (-)

        // Check if the lastDocNumber is from the previous year
        if (lastYearSuffix != yearSuffix)
        {
          // If the year has changed, reset the increment to 1
          newIncrement = 1;
        }
        else if (lastDocNumber.StartsWith($"{prefix}-{yearSuffix}"))
        {
          // Extract the numeric part of the last DocNumber
          string numericPart = lastDocNumber.Substring($"{prefix}-{yearSuffix}-".Length);
          if (int.TryParse(numericPart, out int lastIncrement))
          {
            newIncrement = lastIncrement + 1;
          }
        }
      }

      // Return the new DocNumber with year
      return $"{prefix}-{yearSuffix}-{newIncrement:D3}"; // Example: SO-25-001, SO-25-002, etc.
    }

    /**
     * Get Transaction : switch the type of the Document
     * return if Add or Retrieve
     */
    public static TransactionType GetTransactionType(DocumentTypes documentType)
    {
      switch (documentType)
      {
        case DocumentTypes.supplierOrder:
        case DocumentTypes.supplierReceipt:
        case DocumentTypes.supplierInvoice:
          return TransactionType.Add;

        case DocumentTypes.customerOrder:
        case DocumentTypes.customerDeliveryNote:
        case DocumentTypes.customerInvoice:
          return TransactionType.Retrieve;

        default:
          return TransactionType.None;
      }
    }

  }
}
