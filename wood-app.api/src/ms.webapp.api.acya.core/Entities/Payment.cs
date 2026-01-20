using System;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities.DTOs;

namespace ms.webapp.api.acya.core.Entities
{
    public class Payment : IEntity
    {
        public int Id { get; set; }
        public int DocumentId { get; set; }
        public Document? Document { get; set; }
        public int CustomerId { get; set; }
        public CounterPart? Customer { get; set; }
        
        // Multi-tenancy handled via Document/Customer relation or SalesSite
        // public Guid CompanyReference { get; set; } 

        public DateTime? PaymentDate { get; set; }
        public decimal? Amount { get; set; }
        public string? PaymentMethod { get; set; }
        public string? Reference { get; set; }
        public string? Notes { get; set; }
        
        public DateTime? CreatedAt { get; set; }
        public string? CreatedBy { get; set; }
        
        public DateTime? UpdatedAt { get; set; }
        public int? UpdatedById { get; set; }
        public AppUser? AppUser { get; set; }

        public bool IsDeleted { get; set; }

        public Payment()
        {
            CreatedAt = DateTime.UtcNow;
            IsDeleted = false;
        }

        public Payment(PaymentDto dto)
        {
            UpdateFromDto(dto);
        }

        public void UpdateFromDto(PaymentDto dto)
        {
            Id = dto.PaymentId;
            DocumentId = dto.DocumentId;
            CustomerId = dto.CustomerId;
            PaymentDate = dto.PaymentDate;
            Amount = dto.Amount;
            PaymentMethod = dto.PaymentMethod;
            Reference = dto.Reference;
            Notes = dto.Notes;
            // CreatedBy/UpdatedById processed in service
        }
    }
}
