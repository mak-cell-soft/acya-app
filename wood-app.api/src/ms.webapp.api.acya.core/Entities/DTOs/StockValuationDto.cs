namespace ms.webapp.api.acya.core.Entities.DTOs
{
    public class StockValuationDto
    {
        public int MerchandiseId { get; set; }
        public string Reference { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public double CurrentStockQuantity { get; set; }
        public string Unit { get; set; } = string.Empty;
        
        // Coût Moyen Pondéré (CMP) Method
        public double CmpUnitPrice { get; set; }
        public double CmpTotalValue { get; set; }
        
        // Dernier Prix d'Achat Method
        public double LastPurchasePrice { get; set; }
        public double LastPurchaseTotalValue { get; set; }
    }
}
