using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using ms.webapp.api.acya.core.Entities.DTOs.Mobile;
using ms.webapp.api.acya.core.Interfaces;

namespace ms.webapp.api.acya.Services.Mobile
{
    public class GitHubBuildDispatcher : IGitHubBuildDispatcher
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _config;
        private readonly ILogger<GitHubBuildDispatcher> _logger;

        public GitHubBuildDispatcher(HttpClient httpClient, IConfiguration config, ILogger<GitHubBuildDispatcher> logger)
        {
            _httpClient = httpClient;
            _config = config;
            _logger = logger;
        }

        public async Task<bool> DispatchBuildAsync(MobileBuildDto build, string? environment = null, CancellationToken cancellationToken = default)
        {
            var token = _config["MobileBuild:GitHubToken"] ?? _config["GitHub:Token"];
            var owner = _config["MobileBuild:GitHubOwner"] ?? _config["GitHub:Owner"] ?? "mak-cell-soft";
            var repo = _config["MobileBuild:GitHubRepo"] ?? _config["GitHub:Repo"] ?? "mobile-elance-fo";
            var workflowFile = _config["MobileBuild:WorkflowFileName"] ?? "mobile-build.yml";
            var defaultBranch = _config["MobileBuild:DefaultBranch"] ?? "main";
            var callbackBaseUrl = _config["MobileBuild:CallbackApiBaseUrl"] ?? "https://acya.site/api/";

            if (string.IsNullOrWhiteSpace(token))
            {
                _logger.LogWarning("GitHub token not configured (MobileBuild:GitHubToken). Skipping automated dispatch for build {Id}.", build.Id);
                return false;
            }

            var refBranch = string.IsNullOrWhiteSpace(build.GitBranch) ? defaultBranch : build.GitBranch;
            var targetEnvironment = string.IsNullOrWhiteSpace(environment) ? "production" : environment;

            var dispatchUrl = $"https://api.github.com/repos/{owner}/{repo}/actions/workflows/{workflowFile}/dispatches";

            var payload = new
            {
                @ref = refBranch,
                inputs = new
                {
                    buildId = build.Id.ToString(),
                    apiEnvironment = targetEnvironment,
                    apiBaseUrl = callbackBaseUrl
                }
            };

            var jsonContent = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

            using var request = new HttpRequestMessage(HttpMethod.Post, dispatchUrl);
            request.Content = jsonContent;
            request.Headers.UserAgent.Add(new ProductInfoHeaderValue("ACYA-ERP-Mobile-Build-Service", "1.0"));
            request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            request.Headers.Add("X-GitHub-Api-Version", "2022-11-28");

            try
            {
                var response = await _httpClient.SendAsync(request, cancellationToken);
                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Successfully dispatched GitHub Actions build {Id} to {Owner}/{Repo} (ref: {Branch})",
                        build.Id, owner, repo, refBranch);
                    return true;
                }

                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError("Failed to dispatch GitHub Actions build {Id}. HTTP Status: {Status}, Body: {Response}",
                    build.Id, response.StatusCode, errorBody);
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception occurred while dispatching GitHub Actions build {Id}", build.Id);
                throw;
            }
        }
    }
}
