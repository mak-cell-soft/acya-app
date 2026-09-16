namespace ms.webapp.api.acya.common
{
  public enum DocumentTypes
  {
    supplierOrder = 1,
    supplierReceipt = 2,
    supplierInvoice = 3,
    customerOrder = 4,
    customerDeliveryNote = 5,
    customerInvoice = 6,
    stockTransfer = 7,
    supplierInvoiceReturn = 8,
    customerInvoiceReturn = 9,
    inventory = 10,
    customerQuote = 11, // Devis Client — no stock movement
    supplierMerchandiseReturn = 12, // Retour Marchandise Fournisseur — stock OUT + financial debit
    productionConsumption = 13, // Consommation matières premières pour ordre de production — stock OUT
    productionOutput = 14 // Entrée produit fini ou semi-fini issu d'ordre de production — stock IN
  }
}
