using System;
using ms.webapp.api.acya.core.Entities.DTOs;

namespace ms.webapp.api.acya.core.Entities.Product
{
  public class SalesPriceHistory : IEntity
  {
    public int Id { get; set; }
    public int ArticleId { get; set; }
    public Article? Article { get; set; }
    
    public int CounterPartId { get; set; } // Customer
    public CounterPart? Customer { get; set; }
    
    public double PriceValue { get; set; } // Sales Price
    public DateTime TransactionDate { get; set; }
    
    public int DocumentId { get; set; } // The document source (BL or FA direct)
    public Document? Document { get; set; }
    
    public string? DocNumber { get; set; } // Reference for UI
    public DateTime? CreationDate { get; set; }
    public DateTime? UpdateDate { get; set; }
    public bool IsDeleted { get; set; }

    public int? UpdatedById { get; set; }
    public AppUser? UpdatedBy { get; set; }

    public SalesPriceHistory()
    {
    }
  }
}
