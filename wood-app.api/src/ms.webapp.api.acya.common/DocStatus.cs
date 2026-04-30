namespace ms.webapp.api.acya.common
{
  public enum DocStatus
  {
    Delivered = 1,
    Abandoned = 2,
    Created = 3, 
    Deleted = 4,
    NotDelivered = 5, 
    NotConfirmed = 6,
    Confirmed = 7,
    Completed = 8,
    Pending = 9,
    Sent = 10,
    PartiallyDelivered = 11,
    Validated = 12,
    Submitted = 13,        // BC soumis à approbation (montant > seuil)
    PendingApproval = 14,  // En attente d'une action de l'approbateur
    Approved = 15,         // Approuvé — peut être converti
    Rejected = 16          // Rejeté — avec motif obligatoire
  }

  public enum BillingStatus
  {
    NotBilled = 1,
    Billed = 2,
    PartiallyBilled = 3
  }
  
}
