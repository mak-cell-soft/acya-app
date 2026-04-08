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
    customerQuote = 11  // Devis Client — no stock movement
  }
}
