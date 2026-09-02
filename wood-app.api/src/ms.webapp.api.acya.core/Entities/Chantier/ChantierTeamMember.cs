using System;
using ms.webapp.api.acya.core.Interfaces;

namespace ms.webapp.api.acya.core.Entities.Chantier
{
  /// <summary>
  /// Assignment of an existing Person to a construction project with a designated role.
  /// Strictly reuses existing Person records without creating a duplicate employee entity.
  /// </summary>
  public class ChantierTeamMember : IEntity
  {
    public int Id { get; set; }

    public int ChantierId { get; set; }
    public Chantier? Chantier { get; set; }

    // NOTE: Foreign key to existing Person entity.
    public int PersonId { get; set; }
    public Person? Person { get; set; }

    /// <summary>
    /// Role description on this site (e.g. 'Chef de chantier', 'Conducteur de travaux', 'Ouvrier', 'Électricien').
    /// Free text allows flexible role assignments without rigid enum restrictions.
    /// </summary>
    public string ChantierRole { get; set; } = string.Empty;

    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReleasedAt { get; set; }

    public bool IsActive { get; set; } = true;

    public int AssignedById { get; set; }
    public DateTime CreationDate { get; set; } = DateTime.UtcNow;
  }
}
