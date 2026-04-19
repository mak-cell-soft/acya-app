using System;
using ms.webapp.api.acya.core.Entities.DTOs;

namespace ms.webapp.api.acya.core.Entities.Product
{
  public class PurchasePriceHistory : IEntity
  {
    public int Id { get; set; }
    public int ArticleId { get; set; }
    public Article? Article { get; set; }
    
    public int CounterPartId { get; set; } // Supplier
    public CounterPart? Supplier { get; set; }
    
    public double PriceValue { get; set; } // Purchase Price
    public DateTime TransactionDate { get; set; }
    
    public int DocumentId { get; set; } // The document source (BR or FF direct)
    public Document? Document { get; set; }
    
    public string? DocNumber { get; set; } // Reference for UI
    public DateTime? CreationDate { get; set; }
    public DateTime? UpdateDate { get; set; }
    public bool IsDeleted { get; set; }

    public PurchasePriceHistory()
    {
    }
  }
}
