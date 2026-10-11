using System.ComponentModel.DataAnnotations;

namespace ms.webapp.api.acya.core.Entities.DTOs.Inbound
{
    public class InboundQuoteRequestDto
    {
        [Required(ErrorMessage = "Le produit est obligatoire.")]
        [StringLength(255, ErrorMessage = "Le nom du produit ne peut excéder 255 caractères.")]
        public string Product { get; set; } = string.Empty;

        [Required(ErrorMessage = "La quantité est obligatoire.")]
        [StringLength(100, ErrorMessage = "La quantité ne peut excéder 100 caractères.")]
        public string Quantity { get; set; } = string.Empty;

        [Required(ErrorMessage = "Le nom du client est obligatoire.")]
        [StringLength(150, ErrorMessage = "Le nom ne peut excéder 150 caractères.")]
        public string CustomerName { get; set; } = string.Empty;

        [Required(ErrorMessage = "L'adresse email est obligatoire.")]
        [EmailAddress(ErrorMessage = "L'adresse email n'est pas valide.")]
        [StringLength(150, ErrorMessage = "L'email ne peut excéder 150 caractères.")]
        public string CustomerEmail { get; set; } = string.Empty;

        [StringLength(50, ErrorMessage = "Le numéro de téléphone ne peut excéder 50 caractères.")]
        public string? CustomerPhone { get; set; }

        [StringLength(2000, ErrorMessage = "Le message ne peut excéder 2000 caractères.")]
        public string? Message { get; set; }

        [StringLength(100)]
        public string Source { get; set; } = "socofeb-decor.com";

        [Required(ErrorMessage = "La clé d'idempotence (UUID) est obligatoire.")]
        [StringLength(100, ErrorMessage = "La clé d'idempotence ne peut excéder 100 caractères.")]
        public string IdempotencyKey { get; set; } = string.Empty;
    }
}
