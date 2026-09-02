using System;
using ms.webapp.api.acya.core.Interfaces;

namespace ms.webapp.api.acya.core.Entities.Chantier
{
  /// <summary>
  /// Construction site-specific alert (safety, weather, low stock, delay, quality).
  /// </summary>
  public class ChantierAlert : IEntity
  {
    public int Id { get; set; }

    public int ChantierId { get; set; }
    public Chantier? Chantier { get; set; }

    public string Message { get; set; } = string.Empty;
    public ChantierAlertType AlertType { get; set; } = ChantierAlertType.Warning;
    public bool IsResolved { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
  }
}
