namespace ms.webapp.api.acya.core.Entities.DTOs
{
    public class StockDashboardStatsDto
    {
        public int TotalItems { get; set; }
        public int LowStockItems { get; set; }
        public int OutOfStockItems { get; set; }
        public int HealthyStockItems { get; set; }
        public List<StockQuantityDto>? TopLowStockItems { get; set; }
    }
}
