using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using FirebaseAdmin;
using FirebaseAdmin.Messaging;
using Google.Apis.Auth.OAuth2;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace ms.webapp.api.acya.api.Services.Notifications
{
    /// <summary>
    /// Thread-safe singleton client for Firebase Admin Cloud Messaging.
    /// Handles lazy, safe initialization from environment configuration without requiring
    /// credentials to exist during startup or non-FCM environments.
    /// </summary>
    public class FirebaseMessagingClient : IFirebaseMessagingClient
    {
        private readonly ILogger<FirebaseMessagingClient> _logger;
        private readonly string? _credentialsPath;
        private readonly string? _projectId;
        private readonly bool _isConfigured;
        private readonly FirebaseMessaging? _messaging;

        public bool IsConfigured => _isConfigured;

        public FirebaseMessagingClient(
            IConfiguration configuration,
            ILogger<FirebaseMessagingClient> logger)
            : this(configuration, logger, new DefaultFirebaseCredentialValidator())
        {
        }

        public FirebaseMessagingClient(
            IConfiguration configuration,
            ILogger<FirebaseMessagingClient> logger,
            IFirebaseCredentialValidator credentialValidator)
        {
            _logger = logger;

            // Security: Read credentials path exclusively from environment or non-committed settings
            _credentialsPath = configuration["FIREBASE_CREDENTIALS_PATH"] 
                            ?? configuration["Firebase:CredentialsPath"];
            _projectId = configuration["FIREBASE_PROJECT_ID"] 
                      ?? configuration["Firebase:ProjectId"];

            if (string.IsNullOrWhiteSpace(_credentialsPath))
            {
                _logger.LogInformation("Firebase credentials path not configured. FCM push dispatch is disabled.");
                _isConfigured = false;
                return;
            }

            // Fix 4: Do not include the file path string in the log message or structured log arguments
            if (!credentialValidator.FileExists(_credentialsPath))
            {
                _logger.LogWarning("Configured Firebase credentials file not found. FCM push dispatch is disabled.");
                _isConfigured = false;
                return;
            }

            // Fix 5: Validate configured project ID against credential project ID before enabling dispatch
            try
            {
                var credentialProjectId = credentialValidator.ExtractProjectId(_credentialsPath);

                if (!string.IsNullOrWhiteSpace(_projectId) && !string.IsNullOrWhiteSpace(credentialProjectId))
                {
                    if (!string.Equals(_projectId.Trim(), credentialProjectId.Trim(), StringComparison.OrdinalIgnoreCase))
                    {
                        _logger.LogError("Firebase configuration mismatch: Configured ProjectId '{ConfiguredProjectId}' does not match credential project_id '{CredentialProjectId}'. FCM push dispatch is disabled.",
                            _projectId.Trim(), credentialProjectId.Trim());
                        _isConfigured = false;
                        return;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError("Failed to parse project_id from Firebase credentials: {ErrorMessage}. FCM push dispatch is disabled.", ex.Message);
                _isConfigured = false;
                return;
            }

            try
            {
                var appOptions = new AppOptions
                {
                    Credential = GoogleCredential.FromFile(_credentialsPath)
                };

                if (!string.IsNullOrWhiteSpace(_projectId))
                {
                    appOptions.ProjectId = _projectId;
                }

                // Reuse existing DefaultInstance if already created, or initialize once
                var app = FirebaseApp.DefaultInstance ?? FirebaseApp.Create(appOptions);
                _messaging = FirebaseMessaging.GetMessaging(app);
                _isConfigured = true;

                _logger.LogInformation("FirebaseMessagingClient successfully initialized (ProjectId: {ProjectId})",
                    app.Options.ProjectId ?? "default");
            }
            catch (Exception ex)
            {
                // Fix 4: Do not include credentials path or secret contents in log message
                _logger.LogError("Failed to initialize FirebaseAdmin: {ErrorMessage}. FCM push dispatch is disabled.", ex.Message);
                _isConfigured = false;
            }
        }

        public async Task<FcmBatchSendResult> SendMulticastAsync(
            IReadOnlyList<string> tokens,
            string title,
            string body,
            IReadOnlyDictionary<string, string> data,
            CancellationToken cancellationToken = default)
        {
            var result = new FcmBatchSendResult();

            if (!_isConfigured || _messaging == null)
            {
                _logger.LogDebug("SendMulticastAsync: FCM is not configured. Skipping dispatch.");
                return result;
            }

            if (tokens == null || tokens.Count == 0)
            {
                return result;
            }

            var message = new MulticastMessage
            {
                Tokens = tokens,
                Notification = new Notification
                {
                    Title = title,
                    Body = body
                },
                Data = new Dictionary<string, string>(data)
            };

            try
            {
                var response = await _messaging.SendEachForMulticastAsync(message, cancellationToken);
                result.SuccessCount = response.SuccessCount;
                result.FailureCount = response.FailureCount;

                for (int i = 0; i < response.Responses.Count; i++)
                {
                    var item = response.Responses[i];
                    if (!item.IsSuccess && item.Exception != null)
                    {
                        if (item.Exception is FirebaseMessagingException fex)
                        {
                            // Fix 1: Deactivate token ONLY if explicitly identified as unregistered (HTTP 404 UNREGISTERED).
                            // Do NOT classify InvalidArgument as proof of an invalid token, as it may indicate a payload problem.
                            if (fex.MessagingErrorCode == MessagingErrorCode.Unregistered)
                            {
                                if (i < tokens.Count)
                                {
                                    result.UnregisteredTokens.Add(tokens[i]);
                                }
                            }
                            else
                            {
                                // Transient, payload, or infrastructure error (InvalidArgument, QuotaExceeded, Unavailable, etc.): do NOT deactivate
                                LogSendFailure(_logger, fex);
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                // Isolate transport failures: do not throw into caller
                _logger.LogError("Error executing FCM SendEachForMulticastAsync: {ErrorMessage}", ex.Message);
            }

            return result;
        }

        /// <summary>
        /// Logs a structured, security-safe diagnostic warning for failed FCM device sends.
        /// Captures MessagingErrorCode, general ErrorCode, HTTP status code, and sanitized error message
        /// without exposing registration tokens, credentials, headers, or response payloads.
        /// </summary>
        public static void LogSendFailure(ILogger logger, FirebaseMessagingException fex)
        {
            if (logger == null || fex == null)
            {
                return;
            }

            var messagingErrorCode = fex.MessagingErrorCode?.ToString() ?? "None";
            var errorCode = fex.ErrorCode.ToString();
            int? statusCode = fex.HttpResponse != null ? (int)fex.HttpResponse.StatusCode : null;
            var sanitizedMessage = SanitizeErrorMessage(fex.Message);

            logger.LogWarning(
                "FCM device send error: MessagingErrorCode: {MessagingErrorCode}, ErrorCode: {ErrorCode}, StatusCode: {StatusCode}, ErrorMessage: {ErrorMessage}",
                messagingErrorCode,
                errorCode,
                statusCode,
                sanitizedMessage);
        }

        /// <summary>
        /// Sanitizes exception messages to prevent log injection, CRLF injection, and log pollution.
        /// </summary>
        public static string SanitizeErrorMessage(string? message)
        {
            if (string.IsNullOrWhiteSpace(message))
            {
                return "None";
            }

            // Remove CRLF to prevent log forging
            var sanitized = message.Replace("\r", " ").Replace("\n", " ").Trim();

            // Limit message length to avoid log pollution
            const int maxLength = 500;
            if (sanitized.Length > maxLength)
            {
                sanitized = sanitized.Substring(0, maxLength) + "...";
            }

            return sanitized;
        }
    }
}

