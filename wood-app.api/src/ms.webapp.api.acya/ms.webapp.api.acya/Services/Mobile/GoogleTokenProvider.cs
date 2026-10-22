using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Google.Apis.Auth.OAuth2;

namespace ms.webapp.api.acya.Services.Mobile
{
    public class GoogleTokenProvider : IGoogleTokenProvider
    {
        public async Task<string> GetAccessTokenAsync(string credentialsPath, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(credentialsPath))
            {
                throw new ArgumentException("Credentials path cannot be null or empty.", nameof(credentialsPath));
            }

            if (!File.Exists(credentialsPath))
            {
                throw new FileNotFoundException($"Google service account credentials file not found at '{credentialsPath}'.", credentialsPath);
            }

            GoogleCredential credential;
            using (var stream = File.OpenRead(credentialsPath))
            {
                credential = GoogleCredential.FromStream(stream)
                    .CreateScoped("https://www.googleapis.com/auth/cloud-platform", "https://www.googleapis.com/auth/firebase");
            }

            var tokenAccess = (ITokenAccess)credential;
            var token = await tokenAccess.GetAccessTokenForRequestAsync(cancellationToken: cancellationToken);

            if (string.IsNullOrWhiteSpace(token))
            {
                throw new InvalidOperationException("Failed to acquire OAuth2 access token from Google service account.");
            }

            return token;
        }
    }
}
