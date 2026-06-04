using System;
using ms.webapp.api.acya.core.Permissions;

namespace ms.webapp.api.acya.core.Entities.DTOs
{
    public class UserPermissionsDto
    {
        public int UserId { get; set; }
        public AppPermissionsMap Permissions { get; set; } = new AppPermissionsMap();
    }
}
