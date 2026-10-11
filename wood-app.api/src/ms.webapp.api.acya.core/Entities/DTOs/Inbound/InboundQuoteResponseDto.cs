using System;

namespace ms.webapp.api.acya.core.Entities.DTOs.Inbound
{
    public class InboundQuoteResponseDto
    {
        public bool Success { get; set; }
        public string Status { get; set; } = "Accepted";
        public string TrackingNumber { get; set; } = string.Empty;
        public bool IsDuplicate { get; set; }
        public string Message { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }

        public static InboundQuoteResponseDto Accepted(string trackingNumber, bool isDuplicate, DateTime createdAt, string? customMessage = null)
        {
            return new InboundQuoteResponseDto
            {
                Success = true,
                Status = "Accepted",
                TrackingNumber = trackingNumber,
                IsDuplicate = isDuplicate,
                CreatedAt = createdAt,
                Message = customMessage ?? (isDuplicate 
                    ? "Demande de devis déjà enregistrée sous cette référence." 
                    : "Votre demande de devis a été enregistrée avec succès.")
            };
        }
    }
}
