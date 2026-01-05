using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure.Repositories
{
  public class VehicleRepository : CoreRepository<Vehicle, WoodAppContext>
  {
    public VehicleRepository(WoodAppContext context) : base(context) 
    { 
    
    }
  }
}
