//using Microsoft.AspNetCore.Authorization;
//using Newtonsoft.Json;
//using ms.webapp.api.acya.core.Permissions;

//namespace ms.webapp.api.acya.api.PermissionsHelper
//{
//    public class PermissionHandler : AuthorizationHandler<PermissionRequirement>
//  {
//    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, PermissionRequirement requirement)
//    {
//      var permissionsClaim = context.User.FindFirst("Permissions")?.Value;
//      if (permissionsClaim != null)
//      {
//        var userPermissions = JsonConvert.DeserializeObject<UserPermissions>(permissionsClaim);

//        // Check permission dynamically
//        var hasPermission = userPermissions!.GetType().GetProperty(requirement.Permission)?.GetValue(userPermissions) as bool? == true;
//        if (hasPermission)
//        {
//          context.Succeed(requirement);
//        }
//      }
//      return Task.CompletedTask;
//    }
//  }
//}
