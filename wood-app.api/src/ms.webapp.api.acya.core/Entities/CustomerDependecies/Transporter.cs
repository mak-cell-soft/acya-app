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

    public Transporter()
    {
    }

    public Transporter(TransporterDto dto)
    {
      UpdateFromDto(dto);
    }

    public void UpdateFromDto(TransporterDto dto)
    {
      Id = dto.id;
      FirstName = Helpers.CapitalizeFirstLetter(dto.firstname); ;
      LastName = dto.lastname!.ToUpper();
      FullName = Helpers.CapitalizeFirstLetter(FirstName!) + " " + LastName!.ToUpper();
    }
  }
}
