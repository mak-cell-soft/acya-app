using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace ms.webapp.api.acya.api.Services.Notifications
{
    /// <summary>
    /// Encapsulates the response from an FCM multicast push attempt.
    /// </summary>
    public class FcmBatchSendResult
    {
        public int SuccessCount { get; set; }
        public int FailureCount { get; set; }
        public List<string> UnregisteredTokens { get; set; } = new();
    }

    /// <summary>
    /// Abstraction for communicating with the Firebase Cloud Messaging API.
    /// Decouples dispatcher logic from the concrete FirebaseAdmin SDK for mockability.
    /// </summary>
    public interface IFirebaseMessagingClient
    {
        /// <summary>
        /// Indicates whether the Firebase client was successfully initialized with valid credentials.
        /// </summary>
        bool IsConfigured { get; }

        /// <summary>
        /// Sends a multicast notification to the specified device tokens.
        /// </summary>
        Task<FcmBatchSendResult> SendMulticastAsync(
            IReadOnlyList<string> tokens,
            string title,
            string body,
            IReadOnlyDictionary<string, string> data,
            CancellationToken cancellationToken = default);
    }

    /// <summary>
    /// Service seam for credential validation and project id inspection without reading real credentials during tests.
    /// </summary>
    public interface IFirebaseCredentialValidator
    {
        bool FileExists(string path);
        string? ExtractProjectId(string path);
    }

    public class DefaultFirebaseCredentialValidator : IFirebaseCredentialValidator
    {
        public bool FileExists(string path) => !string.IsNullOrWhiteSpace(path) && File.Exists(path);

        public string? ExtractProjectId(string path)
        {
            if (string.IsNullOrWhiteSpace(path) || !File.Exists(path))
            {
                return null;
            }

            using var stream = File.OpenRead(path);
            using var doc = System.Text.Json.JsonDocument.Parse(stream);
            if (doc.RootElement.TryGetProperty("project_id", out var prop))
            {
                return prop.GetString()?.Trim();
            }
            return null;
        }
    }
}
