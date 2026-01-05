namespace ms.webapp.api.acya.core.Entities.CustomerDependecies
{
  public class Vehicle : IEntity
  {
    public int Id { get; set; }
    public string? SerialNumber { get; set; }
    public string? Brand { get; set; } // Marque
    public DateTime InsuranceDate { get; set; }
    public DateTime TechnicalVisitDate { get; set; }
    public int Mileage { get; set; } // Kilométrage
    public string? Draining { get; set; } // Vidange [filtre à huile, Filtre à air, Filtre ...]
    public DateTime DrainingDate { get; set; }

    public Vehicle() { }
  }
}
