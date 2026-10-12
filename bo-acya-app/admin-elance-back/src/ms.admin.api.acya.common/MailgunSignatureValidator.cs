using System;
using System.Security.Cryptography;
using System.Text;

namespace ms.admin.api.acya.common
{
    public static class MailgunSignatureValidator
    {
        public static bool VerifySignature(string? signingKey, string? timestamp, string? token, string? signature)
        {
            if (string.IsNullOrWhiteSpace(signingKey) ||
                string.IsNullOrWhiteSpace(timestamp) ||
                string.IsNullOrWhiteSpace(token) ||
                string.IsNullOrWhiteSpace(signature))
            {
                return false;
            }

            var message = string.Concat(timestamp, token);
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(signingKey));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(message));
            var computedSignature = Convert.ToHexString(hash).ToLowerInvariant();

            return CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(computedSignature),
                Encoding.UTF8.GetBytes(signature.ToLowerInvariant()));
        }

        public static bool IsTimestampWithinWindow(string? timestamp, int maxWindowSeconds = 900)
        {
            if (string.IsNullOrWhiteSpace(timestamp) || !long.TryParse(timestamp, out var tsSeconds))
            {
                return false;
            }

            var nowSeconds = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            return Math.Abs(nowSeconds - tsSeconds) <= maxWindowSeconds;
        }
    }
}
