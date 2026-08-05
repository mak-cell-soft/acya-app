using System;

namespace ms.webapp.api.acya.core.Entities
{
  public class PlatformSetting
  {
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
  }
}
