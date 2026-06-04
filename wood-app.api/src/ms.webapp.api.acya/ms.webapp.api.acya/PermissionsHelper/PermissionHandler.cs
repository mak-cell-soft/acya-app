using System;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using ms.webapp.api.acya.core.Permissions;

namespace ms.webapp.api.acya.PermissionsHelper
{
    public class PermissionRequirement : IAuthorizationRequirement
    {
        public string Module { get; }
        public string Action { get; }

        /// <summary>
        /// e.g. Module = "Articles", Action = "CanRead"
        /// </summary>
        public PermissionRequirement(string module, string action)
        {
            Module = module;
            Action = action;
        }
    }

    public class PermissionHandler : AuthorizationHandler<PermissionRequirement>
    {
        protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, PermissionRequirement requirement)
        {
            // SuperAdmin (Role 10) implicitly passes all permission checks
            if (context.User.IsInRole("SuperAdmin"))
            {
                context.Succeed(requirement);
                return Task.CompletedTask;
            }

            var permissionsClaim = context.User.FindFirst("Permissions")?.Value;
            if (!string.IsNullOrEmpty(permissionsClaim))
            {
                try
                {
                    var userPermissions = JsonSerializer.Deserialize<AppPermissionsMap>(
                        permissionsClaim, 
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
                    );

                    if (userPermissions != null)
                    {
                        // Dynamically check property
                        var moduleProp = userPermissions.GetType().GetProperty(requirement.Module, System.Reflection.BindingFlags.IgnoreCase | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance);
                        if (moduleProp != null)
                        {
                            var moduleObj = moduleProp.GetValue(userPermissions);
                            if (moduleObj != null)
                            {
                                var actionProp = moduleObj.GetType().GetProperty(requirement.Action, System.Reflection.BindingFlags.IgnoreCase | System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance);
                                if (actionProp != null)
                                {
                                    var hasPermission = actionProp.GetValue(moduleObj) as bool? == true;
                                    if (hasPermission)
                                    {
                                        context.Succeed(requirement);
                                    }
                                }
                            }
                        }
                    }
                }
                catch
                {
                    // Ignore parsing errors, permission check fails
                }
            }
            else
            {
                // If there is no explicit permission record:
                // Admin (Role 20) gets all access by default
                if (context.User.IsInRole("Admin"))
                {
                    context.Succeed(requirement);
                    return Task.CompletedTask;
                }
                
                // Normal users (Role > 20) default to Read only
                if (requirement.Action.Equals("CanRead", StringComparison.OrdinalIgnoreCase))
                {
                    context.Succeed(requirement);
                    return Task.CompletedTask;
                }
            }

            return Task.CompletedTask;
        }
    }
}
