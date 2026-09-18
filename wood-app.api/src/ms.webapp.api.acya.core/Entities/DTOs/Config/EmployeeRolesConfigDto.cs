using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace ms.webapp.api.acya.core.Entities.DTOs.Config
{
    /// <summary>
    /// Represents a single configurable employee function / job title.
    /// Backward-compatible with built-in role numbers (40, 45, 50, 60, 70).
    /// </summary>
    public class EmployeeRoleItemDto
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("code")]
        public int? Code { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("isActive")]
        public bool IsActive { get; set; } = true;
    }

    /// <summary>
    /// Container stored as JSON in AppVariable (Name = 'ROLES').
    /// </summary>
    public class EmployeeRolesConfigDto
    {
        [JsonPropertyName("roles")]
        public List<EmployeeRoleItemDto> Roles { get; set; } = new();
    }
}
