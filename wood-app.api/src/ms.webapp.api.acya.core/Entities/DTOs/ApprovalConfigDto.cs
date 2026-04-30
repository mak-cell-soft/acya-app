namespace ms.webapp.api.acya.core.Entities.DTOs
{
    public class ApprovalConfigDto
    {
        public int id { get; set; }
        public int enterpriseId { get; set; }
        public decimal? thresholdAmount { get; set; }
        public string? approverEmails { get; set; }
        public string? approverRoles { get; set; }
    }
}
