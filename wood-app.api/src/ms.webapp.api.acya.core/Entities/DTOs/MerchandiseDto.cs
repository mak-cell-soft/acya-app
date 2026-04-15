namespace ms.webapp.api.acya.core.Entities.DTOs
{
  public class MerchandiseDto
  {
    public int? id { get; set; }
    public string? packagereference { get; set; }
    public string? description { get; set; }
    public DateTime? creationdate { get; set; }
    public DateTime? updatedate { get; set; }
    public int updatedbyid { get; set; }

    /**
     * Inititial quantity will be stored separately
     */
    public double quantity { get; set; }

    // §5.5 — Reliquats : quantité effectivement livrée (0 par défaut = rien livré)
    public double quantity_delivered { get; set; }

    // §5.5 — Reliquats : quantité restante à livrer (calculée : quantity - quantity_delivered)
    public double quantity_remaining { get; set; }
    public double stock_quantity { get; set; }

    /**
     * Cost Values
     * The Following are All Needed Prices
     */

    /**
     * Unit Price : Prix Unitaire HT
     */
    public double unit_price_ht { get; set; }

    /**
    * Cost Price HT without Discount
    */
    public double cost_ht { get; set; }

    /**
    * % Discount
    */
    public double discount_percentage { get; set; }

    /**
    *  Net Price HT : Prix Net HT 
    *  (Avec la remise si existe)
    */
    public double cost_net_ht { get; set; }

    /**
    * Discount Value : Valeur de la remise 
    * (si existe)
    */
    public double cost_discount_value { get; set; }

    /**
    * TVA Value : Valeur de la TVA
    */
    public double tva_value { get; set; }

    /**
    * Prix TTC : Net TTC
    */
    public double cost_ttc { get; set; }
    
    /**
     * Is Invoicible : Marchandise Facturable
     */
    public bool isinvoicible { get; set; }

    /**
     * Allow Negtiv Stock : Autoriser stock Negatif
     */
    public bool allownegativstock { get; set; }
    public ArticleDto? article { get; set; }
    public int? documentid { get; set; }
    public ListOflengthDto[]? lisoflengths { get; set; }

    /**
     * A Merchandise is merged with another 
     */
    public bool ismergedwith { get; set; }
    public int? idmergedmerchandise { get; set; }
    public bool isdeleted { get; set; }


    public MerchandiseDto() { }
    public MerchandiseDto(Merchandise entity)
    {
      id = entity.Id;
      packagereference = entity.PackageReference;
      description = entity.Description;
      isinvoicible = entity.IsInvoicible;
      allownegativstock = entity.AllowNegativStock;
      ismergedwith = entity.IsMergedWith;
      idmergedmerchandise = entity.IdMergedMerchandise;
      isdeleted = entity.IsDeleted;
      
      if(entity.Articles != null)
      {
        if (article == null)
        {
          article = new ArticleDto();
        }
        article.UpdateFromEntity(entity.Articles);
      }
      else
      {
        article = null;
      }
    }

    public MerchandiseDto(DocumentMerchandise line)
    {
      if (line.Merchandise != null)
      {
          id = line.Merchandise.Id;
          packagereference = line.Merchandise.PackageReference;
          description = line.Merchandise.Description;
          isinvoicible = line.Merchandise.IsInvoicible;
          allownegativstock = line.Merchandise.AllowNegativStock;
          ismergedwith = line.Merchandise.IsMergedWith;
          idmergedmerchandise = line.Merchandise.IdMergedMerchandise;
          isdeleted = line.Merchandise.IsDeleted;
          
          if (line.Merchandise.Articles != null)
          {
              article = new ArticleDto();
              article.UpdateFromEntity(line.Merchandise.Articles);
          }
      }

      documentid = line.DocumentId;
      
      // Populate quantity fields from DocumentMerchandise
      quantity = line.Quantity;
      quantity_delivered = line.QuantityDelivered;
      quantity_remaining = line.QuantityRemaining;

      // Populate pricing fields from DocumentMerchandise
      unit_price_ht = line.UnitPriceHT;
      cost_ht = line.CostHT;
      discount_percentage = line.DiscountPercentage;
      cost_net_ht = line.CostNetHT;
      cost_discount_value = line.CostDiscountValue;
      tva_value = line.TvaValue;
      cost_ttc = line.CostTTC;
    }
  }
}
