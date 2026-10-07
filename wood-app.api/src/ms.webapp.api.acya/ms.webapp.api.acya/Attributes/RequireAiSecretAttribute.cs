using System;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace ms.webapp.api.acya.Attributes
{
    /// <summary>
    /// Service-to-service authentication filter enforcing the pre-shared secret 'X-AI-Secret'.
    /// Validates using constant-time comparison against 'AIService:Secret'.
    /// Strictly protects /api/ai/* endpoints consumed by automation workflows (e.g., n8n).
    /// </summary>
    [AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = false)]
    public class RequireAiSecretAttribute : Attribute, IAsyncActionFilter
    {
        public const string HeaderName = "X-AI-Secret";

        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            var logger = context.HttpContext.RequestServices.GetService<ILogger<RequireAiSecretAttribute>>();
            var config = context.HttpContext.RequestServices.GetRequiredService<IConfiguration>();

            var configuredSecret = config["AIService:Secret"] 
                ?? config["AIService__Secret"] 
                ?? config["AI_SERVICE_SECRET"];

            if (string.IsNullOrWhiteSpace(configuredSecret))
            {
                logger?.LogError("Security Failure: 'AIService:Secret' is not configured on the server.");
                context.Result = new UnauthorizedObjectResult(new { message = "Unauthorized: AI service authentication is not configured." });
                return;
            }

            if (!context.HttpContext.Request.Headers.TryGetValue(HeaderName, out var headerValue) ||
                string.IsNullOrWhiteSpace(headerValue.ToString()))
            {
                logger?.LogWarning("Security Rejection: Missing '{HeaderName}' header for AI API request {Path}.", 
                    HeaderName, context.HttpContext.Request.Path);
                context.Result = new UnauthorizedObjectResult(new { message = "Unauthorized: Missing AI secret header." });
                return;
            }

            var providedSecret = headerValue.ToString().Trim();

            // Constant-time comparison to prevent timing side-channel attacks
            var providedBytes = Encoding.UTF8.GetBytes(providedSecret);
            var configuredBytes = Encoding.UTF8.GetBytes(configuredSecret.Trim());

            if (!CryptographicOperations.FixedTimeEquals(providedBytes, configuredBytes))
            {
                logger?.LogWarning("Security Rejection: Invalid AI secret provided for {Path}.", 
                    context.HttpContext.Request.Path);
                context.Result = new UnauthorizedObjectResult(new { message = "Unauthorized: Invalid AI secret." });
                return;
            }

            await next();
        }
    }
}
