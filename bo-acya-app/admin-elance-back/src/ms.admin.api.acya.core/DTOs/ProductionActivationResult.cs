namespace ms.admin.api.acya.core.DTOs
{
    public class ProductionActivationResult
    {
        public bool Success { get; set; }
        public bool AlreadyMigrated { get; set; }
        public string? ErrorMessage { get; set; }
    }
}
