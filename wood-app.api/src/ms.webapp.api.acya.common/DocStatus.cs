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
    Completed = 8
  }

  public enum BillingStatus
  {
    NotBilled = 1,
    Billed = 2,
    PartiallyBilled = 3
  }
  
}
