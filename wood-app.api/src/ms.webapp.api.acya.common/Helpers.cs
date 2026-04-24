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

    public static string GetPrefixForDocumentType(DocumentTypes type, Dictionary<string, string>? customPrefixes = null)
    {
      if (customPrefixes != null && customPrefixes.TryGetValue(((int)type).ToString(), out string? customPrefix))
      {
        return customPrefix;
      }

      return type switch
      {
        DocumentTypes.supplierOrder => "SO", // Bon de commande Fournisseur
        DocumentTypes.supplierReceipt => "SR", // Bon de réception Fournisseur
        DocumentTypes.supplierInvoice => "FF", // Facture Fournisseur
        DocumentTypes.customerQuote => "DV", // Devis Client — no stock movement
        DocumentTypes.customerOrder => "CO", // Bon de commande Client
        DocumentTypes.customerDeliveryNote => "BL", // Bon de livraison Client
        DocumentTypes.customerInvoice => "FC", // Facture Client
        DocumentTypes.stockTransfer => "TS", // Transfert Stock
        DocumentTypes.customerInvoiceReturn => "AV", // Avoir Client
        DocumentTypes.supplierInvoiceReturn => "AVF", // Avoir Fournisseur
        _ => string.Empty
      };
    }

    /**
    * Here is a Doc number with the Year added in the prefix 2.0
    * The incremetal number changes (reset to 0) if year changes.
    */
    public static string GenerateNewDocNumber(string prefix, string? lastDocNumber, int yearFormat = 2, int incrementLength = 3)
    {
      string yearFormatString = yearFormat == 4 ? "yyyy" : "yy";
      string yearSuffix = DateTime.Now.ToString(yearFormatString); 
      int newIncrement = 1;

      if (!string.IsNullOrEmpty(lastDocNumber))
      {
        // We expect prefix-year-increment
        // Let's find the second hyphen to get the year part reliably if prefix has hyphens
        var parts = lastDocNumber.Split('-');
        if (parts.Length >= 3)
        {
            string lastYearSuffix = parts[parts.Length - 2];
            string lastNumericPart = parts[parts.Length - 1];

            if (lastYearSuffix != yearSuffix)
            {
                newIncrement = 1;
            }
            else
            {
                if (int.TryParse(lastNumericPart, out int lastIncrement))
                {
                    newIncrement = lastIncrement + 1;
                }
            }
        }
      }

      // Return the new DocNumber with year
      string incrementFormat = $"D{incrementLength}";
      return $"{prefix}-{yearSuffix}-{newIncrement.ToString(incrementFormat)}"; // Example: SO-25-001, etc.
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

        case DocumentTypes.customerInvoiceReturn:
          return TransactionType.Add;

        case DocumentTypes.supplierInvoiceReturn:
          return TransactionType.Retrieve;

        // customerQuote: No stock movement — quote only
        case DocumentTypes.customerQuote:
          return TransactionType.None;

        default:
          return TransactionType.None;
      }
    }

    public static string GenerateHoldingTaxReference(string docNumber, string counterPartName)
    {
      string yearMonth = DateTime.Now.ToString("yyMM");
      // Clean counterpart name from spaces and special characters for a cleaner reference
      string cleanName = new string(counterPartName?.Where(c => char.IsLetterOrDigit(c)).ToArray() ?? Array.Empty<char>());
      return $"RS-{docNumber}-{cleanName}-{yearMonth}";
    }
  }
}
