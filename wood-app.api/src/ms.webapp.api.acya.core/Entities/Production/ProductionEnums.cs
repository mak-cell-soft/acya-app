using System.Text.Json.Serialization;

namespace ms.webapp.api.acya.core.Entities.Production
{
  /// <summary>
  /// Lifecycle status of a production order.
  /// </summary>
  [JsonConverter(typeof(JsonStringEnumConverter))]
  public enum ProductionStatus
  {
    Planned = 0,
    InProgress = 1,
    Completed = 2,
    Validated = 3,
    Cancelled = 4
  }

  /// <summary>
  /// Execution status of an individual production step.
  /// </summary>
  [JsonConverter(typeof(JsonStringEnumConverter))]
  public enum ProductionStepStatus
  {
    Planned = 0,
    InProgress = 1,
    Completed = 2,
    Cancelled = 3
  }
}
