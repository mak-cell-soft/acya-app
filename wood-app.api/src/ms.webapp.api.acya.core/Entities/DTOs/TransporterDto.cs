namespace ms.webapp.api.acya.core.Entities.DTOs
{
  public class TransporterDto
  {
    public int id { get; set; }
    public string? firstname { get; set; }
    public string? lastname { get; set; }
    public string? fullname { get; set; }

    public VehicleDto? car { get; set; }

    public TransporterDto()
    {
    }

    public TransporterDto(Transporter entity)
    {
      UpdateFromEntity(entity);
    }

    public void UpdateFromEntity(Transporter entity)
    {
      id = entity.Id;
      firstname = entity.FirstName;
      lastname = entity.LastName;
      fullname = entity.FullName;
      car = new VehicleDto(entity.Vehicle!);
    }
  }

  public class VehicleDto
  {
    public int id { get; set; }
    public string? serialnumber { get; set; }
    public string? brand { get; set; } // Marque
    public DateTime? insurancedate { get; set; }
    public DateTime? technicalvisitdate { get; set; }
    public string? mileage { get; set; } // Kilométrage
    public string? draining { get; set; } // Vidange [filtre à huile, Filtre à air, Filtre ...]
    public DateTime? drainingdate { get; set; }

    public VehicleDto()
    {
    }

    public VehicleDto(Vehicle entity)
    {
      UpdateFromEntity(entity);
    }

    public void UpdateFromEntity(Vehicle entity)
    {
      id = entity.Id;
      serialnumber = entity.SerialNumber;
      brand = entity.Brand;
      insurancedate = entity.InsuranceDate;
      technicalvisitdate = entity.TechnicalVisitDate;
      mileage = entity.Mileage;
      draining = entity.Draining;
      drainingdate = entity.DrainingDate;
    }
  }
}
