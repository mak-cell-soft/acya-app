using System;
using ms.webapp.api.acya.core.Interfaces;

namespace ms.webapp.api.acya.core.Entities.Chantier
{
  /// <summary>
  /// Material requirement planned for a construction site.
  /// Reuses existing Merchandise catalog entity without altering it.
  /// Denormalizes Reference and Designation for display performance and historical permanence.
  /// </summary>
  public class ChantierMaterialRequirement : IEntity
  {
    public int Id { get; set; }

    public int ChantierId { get; set; }
    public Chantier? Chantier { get; set; }

    // NOTE: Links to core Merchandise entity.
    public int MerchandiseId { get; set; }
    public Merchandise? Merchandise { get; set; }

    public string MerchandiseRef { get; set; } = string.Empty;
    public string MerchandiseDesignation { get; set; } = string.Empty;

    public string Category { get; set; } = "Principal";
    public string MaterialType { get; set; } = "Principal"; // "Principal" | "Consumable"

    public double RequiredQty { get; set; } = 0;
    public string Unit { get; set; } = "Unité";

    /// <summary>
    /// Threshold under which remaining material triggers a low-stock alert on the chantier.
    /// </summary>
    public double MinimumQty { get; set; } = 0;

    public DateTime CreationDate { get; set; } = DateTime.UtcNow;
    public bool IsDeleted { get; set; } = false;
  }
}
