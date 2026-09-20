using System.ComponentModel.DataAnnotations;

namespace ms.webapp.api.acya.core.Entities.DTOs
{
    public class SendAccountantEmailDto
    {
        [Required(ErrorMessage = "L'adresse email du comptable est requise.")]
        [EmailAddress(ErrorMessage = "Veuillez saisir une adresse email valide.")]
        public string AccountantEmail { get; set; } = string.Empty;

        [Required(ErrorMessage = "L'objet de l'email est requis.")]
        [StringLength(300)]
        public string Subject { get; set; } = string.Empty;

        [Required(ErrorMessage = "Le corps du message est requis.")]
        public string Message { get; set; } = string.Empty;

        public bool SaveAsDefault { get; set; } = false;
    }
}
