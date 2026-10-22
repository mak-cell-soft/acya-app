using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace ms.webapp.api.acya.Services.Mobile
{
    public class FirebaseManagementApiClient : IFirebaseManagementApiClient
    {
        private readonly HttpClient _httpClient;
        private readonly IGoogleTokenProvider _tokenProvider;
        private readonly IConfiguration _configuration;
        private readonly ILogger<FirebaseManagementApiClient> _logger;

        private const string BaseApiUrl = "https://firebase.googleapis.com";

        public FirebaseManagementApiClient(
            HttpClient httpClient,
            IGoogleTokenProvider tokenProvider,
            IConfiguration configuration,
            ILogger<FirebaseManagementApiClient> logger)
        {
            _httpClient = httpClient;
            _tokenProvider = tokenProvider;
            _configuration = configuration;
            _logger = logger;

            if (_httpClient.BaseAddress == null)
            {
                _httpClient.BaseAddress = new Uri(BaseApiUrl);
            }
        }

        private async Task<string> GetBearerTokenAsync(CancellationToken cancellationToken)
        {
            var credPath = _configuration["FIREBASE_MANAGEMENT_CREDENTIALS_PATH"] 
                        ?? _configuration["Firebase:ManagementCredentialsPath"];

            if (string.IsNullOrWhiteSpace(credPath))
            {
                throw new InvalidOperationException("Firebase management credentials path is not configured. Dedicated provisioning credentials ('FIREBASE_MANAGEMENT_CREDENTIALS_PATH' or 'Firebase:ManagementCredentialsPath') are required. Dispatcher credentials cannot be reused.");
            }

            return await _tokenProvider.GetAccessTokenAsync(credPath, cancellationToken);
        }

        private async Task<HttpRequestMessage> CreateAuthenticatedRequestAsync(HttpMethod method, string relativeUri, CancellationToken cancellationToken)
        {
            var token = await GetBearerTokenAsync(cancellationToken);
            var request = new HttpRequestMessage(method, relativeUri);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            return request;
        }

        public async Task<IReadOnlyList<FirebaseAndroidAppSummary>> ListAndroidAppsAsync(string projectId, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(projectId))
            {
                throw new ArgumentException("ProjectId cannot be null or empty.", nameof(projectId));
            }

            var apps = new List<FirebaseAndroidAppSummary>();
            string? pageToken = null;

            do
            {
                var uri = $"/v1beta1/projects/{Uri.EscapeDataString(projectId)}/androidApps?pageSize=100";
                if (!string.IsNullOrEmpty(pageToken))
                {
                    uri += $"&pageToken={Uri.EscapeDataString(pageToken)}";
                }

                using var request = await CreateAuthenticatedRequestAsync(HttpMethod.Get, uri, cancellationToken);
                using var response = await _httpClient.SendAsync(request, cancellationToken);

                if (response.StatusCode == HttpStatusCode.Unauthorized || response.StatusCode == HttpStatusCode.Forbidden)
                {
                    _logger.LogError("Firebase Management API permission denied (HTTP {StatusCode}) for project '{ProjectId}'.", (int)response.StatusCode, projectId);
                    throw new UnauthorizedAccessException($"Firebase Management API authorization failed (HTTP {(int)response.StatusCode}). Check provisioning service account permissions.");
                }

                if (!response.IsSuccessStatusCode)
                {
                    var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                    _logger.LogError("Firebase Management API ListAndroidApps failed (HTTP {StatusCode}): {Error}", (int)response.StatusCode, errorBody);
                    response.EnsureSuccessStatusCode();
                }

                var jsonStr = await response.Content.ReadAsStringAsync(cancellationToken);
                using var doc = JsonDocument.Parse(jsonStr);
                var root = doc.RootElement;

                if (root.TryGetProperty("apps", out var appsArray) && appsArray.ValueKind == JsonValueKind.Array)
                {
                    foreach (var elem in appsArray.EnumerateArray())
                    {
                        var summary = new FirebaseAndroidAppSummary
                        {
                            Name = elem.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "",
                            AppId = elem.TryGetProperty("appId", out var a) ? a.GetString() ?? "" : "",
                            DisplayName = elem.TryGetProperty("displayName", out var d) ? d.GetString() ?? "" : "",
                            PackageName = elem.TryGetProperty("packageName", out var p) ? p.GetString() ?? "" : ""
                        };
                        apps.Add(summary);
                    }
                }

                pageToken = root.TryGetProperty("nextPageToken", out var tokenProp) ? tokenProp.GetString() : null;

            } while (!string.IsNullOrEmpty(pageToken));

            return apps;
        }

        public async Task<FirebaseOperationResult> CreateAndroidAppAsync(string projectId, string packageName, string displayName, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(projectId)) throw new ArgumentException("ProjectId cannot be null or empty.", nameof(projectId));
            if (string.IsNullOrWhiteSpace(packageName)) throw new ArgumentException("PackageName cannot be null or empty.", nameof(packageName));

            var uri = $"/v1beta1/projects/{Uri.EscapeDataString(projectId)}/androidApps";
            var payload = new
            {
                packageName = packageName.Trim(),
                displayName = !string.IsNullOrWhiteSpace(displayName) ? displayName.Trim() : packageName.Trim()
            };

            using var request = await CreateAuthenticatedRequestAsync(HttpMethod.Post, uri, cancellationToken);
            request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

            using var response = await _httpClient.SendAsync(request, cancellationToken);

            if (response.StatusCode == HttpStatusCode.Conflict)
            {
                _logger.LogInformation("Firebase Android app for package '{PackageName}' already exists in Firebase project '{ProjectId}'.", packageName, projectId);
                return new FirebaseOperationResult
                {
                    Done = true,
                    ErrorCode = 409,
                    ErrorMessage = $"App with package '{packageName}' already exists."
                };
            }

            if (response.StatusCode == HttpStatusCode.Unauthorized || response.StatusCode == HttpStatusCode.Forbidden)
            {
                _logger.LogError("Firebase Management API permission denied (HTTP {StatusCode}) creating app for package '{PackageName}'.", (int)response.StatusCode, packageName);
                throw new UnauthorizedAccessException($"Firebase Management API authorization failed (HTTP {(int)response.StatusCode}). Check provisioning service account permissions.");
            }

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError("Firebase Management API CreateAndroidApp failed (HTTP {StatusCode}): {Error}", (int)response.StatusCode, errorBody);
                response.EnsureSuccessStatusCode();
            }

            var jsonStr = await response.Content.ReadAsStringAsync(cancellationToken);
            using var doc = JsonDocument.Parse(jsonStr);
            var root = doc.RootElement;

            var result = new FirebaseOperationResult
            {
                Name = root.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "",
                Done = root.TryGetProperty("done", out var d) && d.GetBoolean()
            };

            if (root.TryGetProperty("response", out var resp) && resp.TryGetProperty("appId", out var appIdProp))
            {
                result.AppId = appIdProp.GetString();
            }

            return result;
        }

        public async Task<FirebaseOperationResult> GetOperationAsync(string operationName, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(operationName))
            {
                throw new ArgumentException("OperationName cannot be null or empty.", nameof(operationName));
            }

            // Normalise operation path to /v1/{operationName}
            var cleanOp = operationName.TrimStart('/');
            var uri = cleanOp.StartsWith("v1/", StringComparison.OrdinalIgnoreCase) 
                ? $"/{cleanOp}" 
                : $"/v1/{cleanOp}";

            using var request = await CreateAuthenticatedRequestAsync(HttpMethod.Get, uri, cancellationToken);
            using var response = await _httpClient.SendAsync(request, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError("Firebase Management API GetOperation failed (HTTP {StatusCode}): {Error}", (int)response.StatusCode, errorBody);
                response.EnsureSuccessStatusCode();
            }

            var jsonStr = await response.Content.ReadAsStringAsync(cancellationToken);
            using var doc = JsonDocument.Parse(jsonStr);
            var root = doc.RootElement;

            var result = new FirebaseOperationResult
            {
                Name = root.TryGetProperty("name", out var n) ? n.GetString() ?? "" : operationName,
                Done = root.TryGetProperty("done", out var d) && d.GetBoolean()
            };

            if (root.TryGetProperty("error", out var err))
            {
                result.ErrorMessage = err.TryGetProperty("message", out var m) ? m.GetString() : "Operation failed";
                result.ErrorCode = err.TryGetProperty("code", out var c) && c.TryGetInt32(out var codeVal) ? codeVal : 500;
            }

            if (root.TryGetProperty("response", out var resp) && resp.TryGetProperty("appId", out var appIdProp))
            {
                result.AppId = appIdProp.GetString();
            }

            return result;
        }

        public async Task<FirebaseAppConfigResult> GetAndroidAppConfigAsync(string projectId, string appId, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(projectId)) throw new ArgumentException("ProjectId cannot be null or empty.", nameof(projectId));
            if (string.IsNullOrWhiteSpace(appId)) throw new ArgumentException("AppId cannot be null or empty.", nameof(appId));

            var uri = $"/v1beta1/projects/{Uri.EscapeDataString(projectId)}/androidApps/{Uri.EscapeDataString(appId)}/config";

            using var request = await CreateAuthenticatedRequestAsync(HttpMethod.Get, uri, cancellationToken);
            using var response = await _httpClient.SendAsync(request, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError("Firebase Management API GetAndroidAppConfig failed (HTTP {StatusCode}): {Error}", (int)response.StatusCode, errorBody);
                response.EnsureSuccessStatusCode();
            }

            var jsonStr = await response.Content.ReadAsStringAsync(cancellationToken);
            using var doc = JsonDocument.Parse(jsonStr);
            var root = doc.RootElement;

            return new FirebaseAppConfigResult
            {
                ConfigFilename = root.TryGetProperty("configFilename", out var fn) ? fn.GetString() ?? "google-services.json" : "google-services.json",
                ConfigFileContents = root.TryGetProperty("configFileContents", out var fc) ? fc.GetString() ?? "" : ""
            };
        }
    }
}
