using ms.webapp.api.acya.core.Entities.Product;

namespace ms.webapp.api.acya.core.Entities.DTOs
{
  public class DocumentMerchandiseDto
  {
    public int id { get; set; }
    public DateTime? creationdate { get; set; }
    public DateTime? updatedate { get; set; }
    public double quantity { get; set; }
    public double unitpriceHT { get; set; }
    public double costHT { get; set; }
    public double discountPercentage { get; set; }
    public double costNetHT { get; set; }
    public double costDiscountValue { get; set; }
    public double tvaValue { get; set; }
    public double costTTC { get; set; }

    // Foreign keys
    public MerchandiseDto? merchandise { get; set; }
    public ListOflengthDto[]? listOdLengths { get; set; }
    public DocumentDto[]? document { get; set; }
  }
}
