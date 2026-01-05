namespace ms.webapp.api.acya.core.Entities.DTOs
{
  public class StockQuantityDto
  {
    public int MerchandiseId { get; set; }
    public int ArticleId { get; set; }
    public int StockId { get; set; }

    /**
     * Propriétés nécessaires de la Marchandise
     */
    public string? PackageReference { get; set; }
    //public double MerchandiseQuantity { get; set; }
    public string? MerchandiseDescription { get; set; }
    public bool isInvoicible { get; set; }
    public bool AllowNegativeStock { get; set; }
    public bool isMergedWith { get; set; }

    /**
     * Propriétés nécessaires de l'Article
     */
    public string? ArticleReference { get; set; }
    
    /**
     * Propriétés nécessaires du Stock
     */
    public int SiteId { get; set; }
    public double StockQuantity { get; set; }

  }
}
