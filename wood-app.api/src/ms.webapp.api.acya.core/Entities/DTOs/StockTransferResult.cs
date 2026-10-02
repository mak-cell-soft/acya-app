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
        public string? ConfirmationCode { get; set; }
        public int RevisionNumber { get; set; } = 1;
        public bool PinRegenerated { get; set; }

        public static StockTransferResult Ok(string message, int transferId, string reference, string exitDoc, string receiptDoc, string status, string? confirmationCode = null, int revisionNumber = 1, bool pinRegenerated = false)
        {
            return new StockTransferResult
            {
                Success = true,
                Message = message,
                TransferId = transferId,
                TransferRef = reference,
                ExitDocumentNumber = exitDoc,
                ReceiptDocumentNumber = receiptDoc,
                Status = status,
                ConfirmationCode = confirmationCode,
                RevisionNumber = revisionNumber,
                PinRegenerated = pinRegenerated
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
