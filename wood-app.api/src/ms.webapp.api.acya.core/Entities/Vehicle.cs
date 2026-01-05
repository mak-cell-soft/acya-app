using ms.webapp.api.acya.core.Entities.DTOs;

namespace ms.webapp.api.acya.core.Entities
{
  public class Vehicle : IEntity
  {
    public int Id { get; set; }
    public string? SerialNumber { get; set; }
    public string? Brand { get; set; } // Marque
    public DateTime? InsuranceDate { get; set; }
    public DateTime? TechnicalVisitDate { get; set; }
    public string? Mileage { get; set; } // Kilométrage
    public string? Draining { get; set; } // Vidange [filtre à huile, Filtre à air, Filtre ...]
    public DateTime? DrainingDate { get; set; }

    //public Transporter? Transporter { get; set; }

    public Vehicle()
    {
    }

    public Vehicle(VehicleDto dto)
    {
      UpdateFromDto(dto);
    }

    public void UpdateFromDto(VehicleDto dto)
    {
      Id = dto.id;
      SerialNumber = dto.serialnumber; 
      Brand = dto.brand;
      InsuranceDate = dto.insurancedate;
      TechnicalVisitDate = dto.technicalvisitdate;
      Mileage = dto.mileage;
      Draining = dto.draining;
      DrainingDate= dto.drainingdate;
    }
  }
}
