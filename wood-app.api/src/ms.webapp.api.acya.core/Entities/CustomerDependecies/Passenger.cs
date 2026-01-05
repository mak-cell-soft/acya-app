using ms.webapp.api.acya.common;

namespace ms.webapp.api.acya.core.Entities.CustomerDependecies
{
  public class Passenger : IEntity
  {
    public int Id { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? FullName => Helpers.CapitalizeFirstLetter(FirstName!) + " " + LastName!.ToUpper();
    public string? Cin { get; set; }

    public int? CustomerId { get; set; }
    public Customer? customer { get; set; }

  }
}
