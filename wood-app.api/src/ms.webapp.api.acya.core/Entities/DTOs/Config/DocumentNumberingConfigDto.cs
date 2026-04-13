using ms.webapp.api.acya.common;

namespace ms.webapp.api.acya.core.Entities.DTOs.Config
{
    public class DocumentNumberingConfigDto
    {
        public Dictionary<string, string> Prefixes { get; set; } = new Dictionary<string, string>();
        public int YearFormat { get; set; } = 2; // 2 for YY, 4 for YYYY
        public int IncrementLength { get; set; } = 3; // Number of digits for the incremental part (e.g., 3 for 001, 5 for 00001)

        public DocumentNumberingConfigDto()
        {
            // Set default prefixes if not provided
            SetDefaultPrefixes();
        }

        private void SetDefaultPrefixes()
        {
            Prefixes[((int)DocumentTypes.supplierOrder).ToString()] = "SO";
            Prefixes[((int)DocumentTypes.supplierReceipt).ToString()] = "SR";
            Prefixes[((int)DocumentTypes.supplierInvoice).ToString()] = "FF";
            Prefixes[((int)DocumentTypes.customerQuote).ToString()] = "DV";
            Prefixes[((int)DocumentTypes.customerOrder).ToString()] = "CO";
            Prefixes[((int)DocumentTypes.customerDeliveryNote).ToString()] = "BL";
            Prefixes[((int)DocumentTypes.customerInvoice).ToString()] = "FC";
            Prefixes[((int)DocumentTypes.stockTransfer).ToString()] = "TS";
            Prefixes[((int)DocumentTypes.customerInvoiceReturn).ToString()] = "AV";
            Prefixes[((int)DocumentTypes.supplierInvoiceReturn).ToString()] = "AVF";
        }
    }
}
