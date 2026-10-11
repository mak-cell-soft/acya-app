using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using ms.webapp.api.acya.core.Interfaces;

namespace ms.webapp.api.acya.api.Services
{
    /// <summary>
    /// Thread-safe in-memory rate limiter for inbound quote requests.
    /// Limits requests per (ClientIP + Tenant) and per (CustomerEmail + Tenant).
    /// Hashing is applied to emails to avoid storing plaintext PII in memory.
    /// Default limits: 5 requests per IP per hour, 3 requests per email per hour.
    /// </summary>
    public class InMemoryQuoteRequestRateLimiter : IQuoteRequestRateLimiter
    {
        private readonly ConcurrentDictionary<string, List<DateTime>> _ipRequests = new();
        private readonly ConcurrentDictionary<string, List<DateTime>> _emailRequests = new();
        private readonly object _cleanupLock = new();
        private DateTime _lastCleanup = DateTime.UtcNow;

        private readonly int _maxRequestsPerIp;
        private readonly int _maxRequestsPerEmail;
        private readonly TimeSpan _window;

        public InMemoryQuoteRequestRateLimiter(
            int maxRequestsPerIp = 5,
            int maxRequestsPerEmail = 3,
            int windowMinutes = 60)
        {
            _maxRequestsPerIp = maxRequestsPerIp;
            _maxRequestsPerEmail = maxRequestsPerEmail;
            _window = TimeSpan.FromMinutes(windowMinutes);
        }

        public bool IsAllowed(string clientIp, string email, string? tenantSlug, out int retryAfterSeconds)
        {
            var now = DateTime.UtcNow;
            retryAfterSeconds = 0;

            CleanupOldEntriesIfDue(now);

            var tenant = string.IsNullOrWhiteSpace(tenantSlug) ? "default" : tenantSlug.Trim().ToLowerInvariant();
            var normalizedIp = string.IsNullOrWhiteSpace(clientIp) ? "unknown" : clientIp.Trim();
            var emailHash = HashEmail(email);

            var ipKey = $"{tenant}:quote:ip:{normalizedIp}";
            var emailKey = $"{tenant}:quote:email:{emailHash}";

            // 1. Check IP limit
            var ipList = _ipRequests.GetOrAdd(ipKey, _ => new List<DateTime>());
            lock (ipList)
            {
                ipList.RemoveAll(t => now - t > _window);
                if (ipList.Count >= _maxRequestsPerIp)
                {
                    var oldestInWindow = ipList.Min();
                    var remaining = _window - (now - oldestInWindow);
                    retryAfterSeconds = Math.Max(1, (int)Math.Ceiling(remaining.TotalSeconds));
                    return false;
                }
            }

            // 2. Check Email limit
            if (!string.IsNullOrWhiteSpace(emailHash))
            {
                var emailList = _emailRequests.GetOrAdd(emailKey, _ => new List<DateTime>());
                lock (emailList)
                {
                    emailList.RemoveAll(t => now - t > _window);
                    if (emailList.Count >= _maxRequestsPerEmail)
                    {
                        var oldestInWindow = emailList.Min();
                        var remaining = _window - (now - oldestInWindow);
                        retryAfterSeconds = Math.Max(1, (int)Math.Ceiling(remaining.TotalSeconds));
                        return false;
                    }
                }
            }

            // 3. Record accepted submission
            lock (ipList)
            {
                ipList.Add(now);
            }

            if (!string.IsNullOrWhiteSpace(emailHash))
            {
                var emailList = _emailRequests.GetOrAdd(emailKey, _ => new List<DateTime>());
                lock (emailList)
                {
                    emailList.Add(now);
                }
            }

            return true;
        }

        private void CleanupOldEntriesIfDue(DateTime now)
        {
            if (now - _lastCleanup < TimeSpan.FromMinutes(10)) return;

            lock (_cleanupLock)
            {
                if (now - _lastCleanup < TimeSpan.FromMinutes(10)) return;

                foreach (var kvp in _ipRequests)
                {
                    lock (kvp.Value)
                    {
                        kvp.Value.RemoveAll(t => now - t > _window);
                    }
                    if (kvp.Value.Count == 0) _ipRequests.TryRemove(kvp.Key, out _);
                }

                foreach (var kvp in _emailRequests)
                {
                    lock (kvp.Value)
                    {
                        kvp.Value.RemoveAll(t => now - t > _window);
                    }
                    if (kvp.Value.Count == 0) _emailRequests.TryRemove(kvp.Key, out _);
                }

                _lastCleanup = now;
            }
        }

        private static string HashEmail(string? email)
        {
            if (string.IsNullOrWhiteSpace(email)) return string.Empty;
            var normalized = email.Trim().ToLowerInvariant();
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(normalized));
            return Convert.ToHexString(bytes);
        }
    }
}
