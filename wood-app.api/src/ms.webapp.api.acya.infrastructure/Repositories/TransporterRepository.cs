using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;

namespace ms.webapp.api.acya.infrastructure.Repositories
{
  public class TransporterRepository : CoreRepository<Transporter, WoodAppContext>
  {
    public TransporterRepository(WoodAppContext context) : base(context)
    {
    }

    public async Task<Transporter?> GetByFullName(string fullname)
    {
      return await context.Transporters
        .Where(a => a.FullName! == fullname)
        .FirstOrDefaultAsync();
    }

    public async Task<bool> ExistsByFullName(string fullName)
    {
      return await context.Transporters
        .AnyAsync(a => a.FullName! == fullName);
    }

    public new async Task<IEnumerable<TransporterDto>> GetAllAsync()
    {
      // --- AUTO-SYNC ENTERPRISE VEHICLES ---
      var ownedVehicles = await context.Vehicles.Where(v => v.IsOwned).ToListAsync();
      var existingTransportersWithVehicles = await context.Transporters.Where(t => t.VehicleId != null).ToListAsync();
      var vehicleIdsInTransporters = existingTransportersWithVehicles.Select(t => t.VehicleId).ToHashSet();

      var hasChanges = false;
      foreach (var vehicle in ownedVehicles)
      {
        string expectedFullName = !string.IsNullOrWhiteSpace(vehicle.FuelCardConductor) 
            ? vehicle.FuelCardConductor.Trim() 
            : "Véhicule " + (vehicle.SerialNumber ?? "Interne");

        if (!vehicleIdsInTransporters.Contains(vehicle.Id))
        {
          var tr = new Transporter
          {
            FirstName = !string.IsNullOrWhiteSpace(vehicle.FuelCardConductor) ? "" : "Véhicule",
            LastName = !string.IsNullOrWhiteSpace(vehicle.FuelCardConductor) ? vehicle.FuelCardConductor.Trim() : (vehicle.SerialNumber ?? "Interne"),
            FullName = expectedFullName,
            VehicleId = vehicle.Id
          };
          context.Transporters.Add(tr);
          hasChanges = true;
        }
        else
        {
          // Update existing transporter's name if the vehicle serial or conductor changed
          var tr = existingTransportersWithVehicles.FirstOrDefault(t => t.VehicleId == vehicle.Id);
          if (tr != null && tr.FullName != expectedFullName)
          {
            tr.FirstName = !string.IsNullOrWhiteSpace(vehicle.FuelCardConductor) ? "" : "Véhicule";
            tr.LastName = !string.IsNullOrWhiteSpace(vehicle.FuelCardConductor) ? vehicle.FuelCardConductor.Trim() : (vehicle.SerialNumber ?? "Interne");
            tr.FullName = expectedFullName;
            context.Transporters.Update(tr);
            hasChanges = true;
          }
        }
      }

      if (hasChanges)
      {
        await context.SaveChangesAsync();
      }
      // -------------------------------------

      var allTransporters = await context.Transporters
          .Include(cat => cat.Vehicle)
          .ToListAsync();

      var allDtos = allTransporters.Select(tr => new TransporterDto(tr)).ToList();
      return allDtos!;
    }
  }
}
