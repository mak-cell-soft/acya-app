using Microsoft.AspNetCore.Authorization;

namespace ms.webapp.api.acya.api.PermissionsHelper
{
  public class PermissionRequirement : IAuthorizationRequirement
  {
    public string Permission { get; }
    public PermissionRequirement(string permission)
    {
      Permission = permission;
    }
  }
}
