using ms.webapp.api.acya.core.Interfaces;
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ms.webapp.api.acya.core.Entities
{
    public class PricingGrid : IEntity, IAuditable
    {
        public int Id { get; set; }

        public int CounterPartId { get; set; }
        public CounterPart? CounterPart { get; set; }

        public int? MerchandiseId { get; set; }
        public Merchandise? Merchandise { get; set; }

        public double DiscountRate { get; set; }

        public DateTime? ValidFrom { get; set; }
        public DateTime? ValidUntil { get; set; }

        public bool IsActive { get; set; } = true;

        public string? Notes { get; set; }

        public DateTime? CreationDate { get; set; }
        public DateTime? UpdateDate { get; set; }

        public int UpdatedById { get; set; }
        public AppUser? AppUsers { get; set; }

        public PricingGrid()
        {
        }
    }
}
