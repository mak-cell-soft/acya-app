namespace ms.webapp.api.acya.core.Entities.DTOs
{
    public class StockTransferResult
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public int TransferId { get; set; }
        public string TransferRef { get; set; } = string.Empty;
        public string? ExitDocumentNumber { get; set; }
        public string? ReceiptDocumentNumber { get; set; }
        public string? Status { get; set; }

        public static StockTransferResult Ok(string message, int transferId, string reference, string exitDoc, string receiptDoc, string status)
        {
            return new StockTransferResult
            {
                Success = true,
                Message = message,
                TransferId = transferId,
                TransferRef = reference,
                ExitDocumentNumber = exitDoc,
                ReceiptDocumentNumber = receiptDoc,
                Status = status
            };
        }

        public static StockTransferResult Fail(string message)
        {
            return new StockTransferResult
            {
                Success = false,
                Message = message
            };
        }
    }
}
