using ms.webapp.api.acya.core.Entities.Product;

namespace ms.webapp.api.acya.core.Entities
{
  public class DocumentMerchandise : IEntity
  {
    public int Id { get; set; } // New primary key

    // Properties moved from Merchandise
    public DateTime? CreationDate { get; set; }
    public DateTime? UpdateDate { get; set; }

    /**
    * Inititial quantity will be stored separately
    * for history
    */
    public double Quantity { get; set; }

    /**
     * Cost Values
     * The Following are All Needed Prices
     */

    /**
     * Unit Price : Prix Unitaire HT
     */
    public double UnitPriceHT { get; set; }

    /**
   * Cost Price HT without Discount
   */
    public double CostHT { get; set; }

    /**
    * % Discount
    */
    public double DiscountPercentage { get; set; }

    /**
   *  Net Price HT : Prix Net HT 
   *  (Avec la remise si existe)
   */
    public double CostNetHT { get; set; }

    /**
  * Discount Value : Valeur de la remise 
  * (si existe)
  */
    public double CostDiscountValue { get; set; }

    /**
   * TVA Value : Valeur de la TVA
   */
    public double TvaValue { get; set; }

    /**
   * Prix TTC : Net TTC
   */
    public double CostTTC { get; set; }

    // Foreign keys
    public int DocumentId { get; set; }
    public Document? Document { get; set; }

    public int MerchandiseId { get; set; }
    public Merchandise? Merchandise { get; set; }

    public QuantityMovement? QuantityMovements { get; set; }
  }
}
