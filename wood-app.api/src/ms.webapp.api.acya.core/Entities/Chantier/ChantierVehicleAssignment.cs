using System;
using ms.webapp.api.acya.core.Interfaces;

namespace ms.webapp.api.acya.core.Entities.Chantier
{
  /// <summary>
  /// Assignment of a fleet vehicle to a construction site (Magasin tab).
  /// Reuses existing Vehicle and Person entities.
  /// </summary>
  public class ChantierVehicleAssignment : IEntity
  {
    public int Id { get; set; }

    public int ChantierId { get; set; }
    public Chantier? Chantier { get; set; }

    // NOTE: Links to core Vehicle entity.
    public int VehicleId { get; set; }
    public Vehicle? Vehicle { get; set; }

    // NOTE: Optional designated driver from core Person entity.
    public int? DriverPersonId { get; set; }
    public Person? DriverPerson { get; set; }

    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReleasedAt { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Notes { get; set; }

    public DateTime CreationDate { get; set; } = DateTime.UtcNow;
  }
}
