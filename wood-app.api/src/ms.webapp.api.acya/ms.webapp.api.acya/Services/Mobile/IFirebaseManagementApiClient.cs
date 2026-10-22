using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace ms.webapp.api.acya.Services.Mobile
{
    public class FirebaseAndroidAppSummary
    {
        public string Name { get; set; } = string.Empty;
        public string AppId { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string PackageName { get; set; } = string.Empty;
    }

    public class FirebaseOperationResult
    {
        public string Name { get; set; } = string.Empty;
        public bool Done { get; set; }
        public string? AppId { get; set; }
        public string? ErrorMessage { get; set; }
        public int? ErrorCode { get; set; }
    }

    public class FirebaseAppConfigResult
    {
        public string ConfigFilename { get; set; } = "google-services.json";
        public string ConfigFileContents { get; set; } = string.Empty;
    }

    /// <summary>
    /// REST client communicating with the Google Firebase Management API (v1beta1).
    /// </summary>
    public interface IFirebaseManagementApiClient
    {
        Task<IReadOnlyList<FirebaseAndroidAppSummary>> ListAndroidAppsAsync(string projectId, CancellationToken cancellationToken = default);
        Task<FirebaseOperationResult> CreateAndroidAppAsync(string projectId, string packageName, string displayName, CancellationToken cancellationToken = default);
        Task<FirebaseOperationResult> GetOperationAsync(string operationName, CancellationToken cancellationToken = default);
        Task<FirebaseAppConfigResult> GetAndroidAppConfigAsync(string projectId, string appId, CancellationToken cancellationToken = default);
    }
}
