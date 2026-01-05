using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities.DTOs;

namespace ms.webapp.api.acya.core.Entities
{
  public class Transporter : IEntity
  {
    public int Id { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? FullName { get; set; } 

    public int? VehicleId { get; set; }
    public Vehicle? Vehicle { get; set; }

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
