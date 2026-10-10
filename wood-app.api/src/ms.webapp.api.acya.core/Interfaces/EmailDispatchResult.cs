namespace ms.webapp.api.acya.core.Interfaces
{
    public enum EmailDispatchStatus
    {
        Accepted,
        Rejected,
        Unknown
    }

    public record EmailDispatchResult(
        EmailDispatchStatus Status,
        string? MessageId = null,
        string? ErrorMessage = null
    )
    {
        public static EmailDispatchResult Success(string? messageId = null) =>
            new(EmailDispatchStatus.Accepted, messageId);

        public static EmailDispatchResult Rejected(string? reason) =>
            new(EmailDispatchStatus.Rejected, null, reason);

        public static EmailDispatchResult Unknown(string? reason) =>
            new(EmailDispatchStatus.Unknown, null, reason);
    }
}
