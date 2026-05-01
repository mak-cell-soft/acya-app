using System;

namespace ms.webapp.api.acya.core.Entities.DTOs
{
    public class PricingGridDto
    {
        public int id { get; set; }
        public int counterpartid { get; set; }
        public int? merchandiseid { get; set; }
        public int? articleid { get; set; }
        public string? merchandisename { get; set; }
        public string? merchandisereference { get; set; }
        public double discountrate { get; set; }
        public DateTime? validfrom { get; set; }
        public DateTime? validuntil { get; set; }
        public bool isactive { get; set; }
        public string? notes { get; set; }
        public int? updatedbyid { get; set; }

        public PricingGridDto() { }

        public PricingGridDto(PricingGrid entity)
        {
            id = entity.Id;
            counterpartid = entity.CounterPartId;
            merchandiseid = entity.MerchandiseId;
            articleid = entity.Merchandise?.ArticleId;
            merchandisename = entity.Merchandise?.Articles?.Description;
            merchandisereference = entity.Merchandise?.Articles?.Reference;
            discountrate = entity.DiscountRate;
            validfrom = entity.ValidFrom;
            validuntil = entity.ValidUntil;
            isactive = entity.IsActive;
            notes = entity.Notes;
            updatedbyid = entity.UpdatedById;
        }
    }

    public class PricingGridLookupDto
    {
        public int merchandiseid { get; set; }
        public double discountrate { get; set; }
    }
}
