namespace ms.webapp.api.acya.core.Entities.DTOs
{
    public class ConfirmTransferRequest
    {
        public int ConfirmedByUserId { get; set; }
        public string? ConfirmationCode { get; set; }
        public string? Comment { get; set; }
    }

    public class RejectTransferRequest
    {
        public int RejectedByUserId { get; set; }
        public string Reason { get; set; } = string.Empty;
    }
}
