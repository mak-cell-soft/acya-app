namespace ms.webapp.api.acya.core.Entities.DTOs
{
    public class ArticleImportDto
    {
        public string? Reference { get; set; }
        public string? Description { get; set; }
        public string? CategoryName { get; set; }
        public string? SubCategoryName { get; set; }
        public bool IsWood { get; set; }
        public string? Thickness { get; set; }
        public string? Width { get; set; }
        public string? Unit { get; set; }
        public double SellPriceHT { get; set; }
        public double LastPurchasePriceTTC { get; set; }
        public double TvaRate { get; set; }
        public double MinQuantity { get; set; }
        public string? Lengths { get; set; }
    }
}
