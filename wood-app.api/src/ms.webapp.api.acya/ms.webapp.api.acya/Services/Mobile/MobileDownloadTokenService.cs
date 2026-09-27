using System;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using ms.webapp.api.acya.core.Interfaces;

namespace ms.webapp.api.acya.Services.Mobile
{
    /// <summary>
    /// Service to issue and verify short-lived, tamper-proof download tokens.
    /// Tokens are cryptographically signed using HMAC-SHA256 with the server's secret key.
    /// </summary>
    public class MobileDownloadTokenService : IMobileDownloadTokenService
    {
        private readonly byte[] _signingKey;
        private readonly TimeSpan _defaultLifetime;

        public MobileDownloadTokenService(IConfiguration configuration)
        {
            var secret = configuration["JWTSettings:securityKey"] 
                      ?? configuration["TokenKey"] 
                      ?? "default_secret_key_for_mobile_download_tokens_minimum_32_characters";

            _signingKey = Encoding.UTF8.GetBytes(secret);

            var ttlMinutes = configuration.GetValue<int?>("MobileStorage:DownloadTokenTtlMinutes") ?? 15;
            _defaultLifetime = TimeSpan.FromMinutes(ttlMinutes);
        }

        private class TokenPayload
        {
            public int Rid { get; set; }
            public string Tid { get; set; } = string.Empty;
            public int? Uid { get; set; }
            public long Exp { get; set; }
            public string Nonce { get; set; } = string.Empty;
        }

        public string GenerateToken(int releaseId, string tenantId, int? userId, TimeSpan? lifetime = null)
        {
            var ttl = lifetime ?? _defaultLifetime;
            var expiresAt = DateTimeOffset.UtcNow.Add(ttl);

            var payload = new TokenPayload
            {
                Rid = releaseId,
                Tid = tenantId.Trim().ToLowerInvariant(),
                Uid = userId,
                Exp = expiresAt.ToUnixTimeSeconds(),
                Nonce = Guid.NewGuid().ToString("N")
            };

            var payloadBytes = JsonSerializer.SerializeToUtf8Bytes(payload);
            var payloadB64 = Base64UrlEncode(payloadBytes);

            using var hmac = new HMACSHA256(_signingKey);
            var signatureBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(payloadB64));
            var signatureB64 = Base64UrlEncode(signatureBytes);

            return $"{payloadB64}.{signatureB64}";
        }

        public bool TryValidateToken(string rawToken, out ValidatedDownloadToken? validatedToken)
        {
            validatedToken = null;

            if (string.IsNullOrWhiteSpace(rawToken))
            {
                return false;
            }

            var parts = rawToken.Split('.');
            if (parts.Length != 2)
            {
                return false;
            }

            var payloadB64 = parts[0];
            var signatureB64 = parts[1];

            try
            {
                // Verify signature using constant-time comparison
                using var hmac = new HMACSHA256(_signingKey);
                var expectedSigBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(payloadB64));
                var providedSigBytes = Base64UrlDecode(signatureB64);

                if (!CryptographicOperations.FixedTimeEquals(expectedSigBytes, providedSigBytes))
                {
                    return false;
                }

                // Deserialize payload
                var payloadBytes = Base64UrlDecode(payloadB64);
                var payload = JsonSerializer.Deserialize<TokenPayload>(payloadBytes);
                if (payload == null)
                {
                    return false;
                }

                // Check expiration
                var nowUnix = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
                if (payload.Exp <= nowUnix)
                {
                    return false;
                }

                validatedToken = new ValidatedDownloadToken
                {
                    ReleaseId = payload.Rid,
                    TenantId = payload.Tid,
                    UserId = payload.Uid,
                    ExpiresAt = DateTimeOffset.FromUnixTimeSeconds(payload.Exp).UtcDateTime
                };

                return true;
            }
            catch
            {
                return false;
            }
        }

        private static string Base64UrlEncode(byte[] input)
        {
            return Convert.ToBase64String(input)
                .TrimEnd('=')
                .Replace('+', '-')
                .Replace('/', '_');
        }

        private static byte[] Base64UrlDecode(string input)
        {
            var base64 = input.Replace('-', '+').Replace('_', '/');
            switch (base64.Length % 4)
            {
                case 2: base64 += "=="; break;
                case 3: base64 += "="; break;
            }
            return Convert.FromBase64String(base64);
        }
    }
}
