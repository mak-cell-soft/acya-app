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
    /// Service-to-service authentication filter enforcing the pre-shared secret 'X-Integration-Key'.
    /// Validates using constant-time comparison against 'QuoteIntegration:Secret'.
    /// Strictly protects /api/public/quote-requests consumed by external website backends (socofeb-decor.com).
    /// </summary>
    [AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = false)]
    public class RequireQuoteIntegrationSecretAttribute : Attribute, IAsyncActionFilter
    {
        public const string HeaderName = "X-Integration-Key";

        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            var logger = context.HttpContext.RequestServices.GetService<ILogger<RequireQuoteIntegrationSecretAttribute>>();
            var config = context.HttpContext.RequestServices.GetRequiredService<IConfiguration>();

            var configuredSecret = config["QuoteIntegration:Secret"]
                ?? config["QuoteIntegration__Secret"]
                ?? config["QUOTE_INTEGRATION_SECRET"];

            if (string.IsNullOrWhiteSpace(configuredSecret))
            {
                logger?.LogError("Security Failure: 'QuoteIntegration:Secret' is not configured on the server.");
                context.Result = new UnauthorizedObjectResult(new { message = "Unauthorized: Quote integration authentication is not configured." });
                return;
            }

            if (!context.HttpContext.Request.Headers.TryGetValue(HeaderName, out var headerValue) ||
                string.IsNullOrWhiteSpace(headerValue.ToString()))
            {
                logger?.LogWarning("Security Rejection: Missing '{HeaderName}' header for quote request {Path}.",
                    HeaderName, context.HttpContext.Request.Path);
                context.Result = new UnauthorizedObjectResult(new { message = "Unauthorized: Missing integration key header." });
                return;
            }

            var providedSecret = headerValue.ToString().Trim();

            // Constant-time comparison to prevent timing side-channel attacks
            var providedBytes = Encoding.UTF8.GetBytes(providedSecret);
            var configuredBytes = Encoding.UTF8.GetBytes(configuredSecret.Trim());

            if (!CryptographicOperations.FixedTimeEquals(providedBytes, configuredBytes))
            {
                logger?.LogWarning("Security Rejection: Invalid integration key provided for {Path}.",
                    context.HttpContext.Request.Path);
                context.Result = new UnauthorizedObjectResult(new { message = "Unauthorized: Invalid integration key." });
                return;
            }

            await next();
        }
    }
}
