using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace ms.webapp.api.acya.Attributes
{
    /// <summary>
    /// Authorizes either an authenticated user with Admin / SuperAdmin role (or MobileApp.CanBuild permission),
    /// OR a CI worker providing a valid pre-shared CI Token via header 'X-CI-Token' or 'Authorization: Bearer [token]'.
    /// Ensures least-privilege access for automated CI/CD runners without requiring admin user credentials.
    /// </summary>
    [AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = false)]
    public class AuthorizeAdminOrCiTokenAttribute : Attribute, IAsyncActionFilter
    {
        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            var user = context.HttpContext.User;

            // 1. Check if user is authenticated with Admin / SuperAdmin role or MobileApp.CanBuild
            if (user.Identity?.IsAuthenticated == true && 
                (user.IsInRole("Admin") || user.IsInRole("SuperAdmin") || user.HasClaim("Permission", "MobileApp.CanBuild") || user.HasClaim(ClaimTypes.Role, "Admin") || user.HasClaim(ClaimTypes.Role, "SuperAdmin")))
            {
                await next();
                return;
            }

            // 2. Check dedicated CI Token (header X-CI-Token or Authorization: Bearer <token>)
            var config = context.HttpContext.RequestServices.GetRequiredService<IConfiguration>();
            var configuredCiToken = config["MobileBuild:CiToken"];

            if (!string.IsNullOrWhiteSpace(configuredCiToken))
            {
                string? providedToken = null;

                if (context.HttpContext.Request.Headers.TryGetValue("X-CI-Token", out var headerVal))
                {
                    providedToken = headerVal.ToString();
                }
                else if (context.HttpContext.Request.Headers.TryGetValue("Authorization", out var authHeaderVal))
                {
                    var authStr = authHeaderVal.ToString();
                    if (authStr.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                    {
                        providedToken = authStr.Substring("Bearer ".Length).Trim();
                    }
                }

                if (!string.IsNullOrWhiteSpace(providedToken) && string.Equals(providedToken, configuredCiToken, StringComparison.Ordinal))
                {
                    // Create CI worker principal
                    var claims = new[]
                    {
                        new Claim(ClaimTypes.Name, "GitHubActions-CI"),
                        new Claim(ClaimTypes.Role, "MobileBuildWorker"),
                        new Claim("Scope", "mobile:build")
                    };
                    var identity = new ClaimsIdentity(claims, "CiTokenAuth");
                    context.HttpContext.User = new ClaimsPrincipal(identity);

                    await next();
                    return;
                }
            }

            context.Result = new UnauthorizedObjectResult(new { message = "Unauthorized: Valid Admin authorization or CI service token required." });
        }
    }
}
