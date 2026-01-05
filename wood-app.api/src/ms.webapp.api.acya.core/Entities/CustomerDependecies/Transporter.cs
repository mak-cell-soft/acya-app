using ms.webapp.api.acya.common;

namespace ms.webapp.api.acya.core.Entities.CustomerDependecies
{
  public class Transporter : IEntity
  {
    public int Id { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string FullName => Helpers.CapitalizeFirstLetter(FirstName!) + " " + LastName!.ToUpper();

    
    public int? CarId { get; set; }
    public Vehicle? car { get; set; }
  }
}
