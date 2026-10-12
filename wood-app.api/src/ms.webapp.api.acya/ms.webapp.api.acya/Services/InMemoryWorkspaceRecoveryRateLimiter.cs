using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using ms.webapp.api.acya.core.Interfaces;

namespace ms.webapp.api.acya.Services
{
    /// <summary>
    /// Thread-safe in-memory rate limiter for workspace discovery & recovery requests.
    /// Limits requests per ClientIP and per TargetEmail.
    /// Email addresses are hashed using SHA-256 to ensure no plaintext PII is retained in memory.
    /// </summary>
    public class InMemoryWorkspaceRecoveryRateLimiter : IWorkspaceRecoveryRateLimiter
    {
        private readonly ConcurrentDictionary<string, List<DateTime>> _ipRequests = new();
        private readonly ConcurrentDictionary<string, List<DateTime>> _emailRequests = new();
        private readonly object _cleanupLock = new();
        private DateTime _lastCleanup = DateTime.UtcNow;

        private readonly int _maxRequestsPerIp;
        private readonly int _maxRequestsPerEmail;
        private readonly TimeSpan _window;

        public InMemoryWorkspaceRecoveryRateLimiter(
            int maxRequestsPerIp = 5,
            int maxRequestsPerEmail = 3,
            int windowMinutes = 15)
        {
            _maxRequestsPerIp = maxRequestsPerIp;
            _maxRequestsPerEmail = maxRequestsPerEmail;
            _window = TimeSpan.FromMinutes(windowMinutes);
        }

        public bool IsAllowed(string clientIp, string email, out int retryAfterSeconds)
        {
            var now = DateTime.UtcNow;
            retryAfterSeconds = 0;

            CleanupOldEntriesIfDue(now);

            var normalizedIp = string.IsNullOrWhiteSpace(clientIp) ? "unknown" : clientIp.Trim();
            var emailHash = HashEmail(email);

            var ipKey = $"ip:{normalizedIp}";
            var emailKey = $"email:{emailHash}";

            // 1. Check IP limit
            var ipList = _ipRequests.GetOrAdd(ipKey, _ => new List<DateTime>());
            lock (ipList)
            {
                ipList.RemoveAll(t => now - t > _window);
                if (ipList.Count >= _maxRequestsPerIp)
                {
                    var oldestInWindow = ipList.Min();
                    var timeUntilRelease = _window - (now - oldestInWindow);
                    retryAfterSeconds = Math.Max(1, (int)Math.Ceiling(timeUntilRelease.TotalSeconds));
                    return false;
                }
            }

            // 2. Check Email limit (if email is non-empty)
            if (!string.IsNullOrWhiteSpace(email))
            {
                var emailList = _emailRequests.GetOrAdd(emailKey, _ => new List<DateTime>());
                lock (emailList)
                {
                    emailList.RemoveAll(t => now - t > _window);
                    if (emailList.Count >= _maxRequestsPerEmail)
                    {
                        var oldestInWindow = emailList.Min();
                        var timeUntilRelease = _window - (now - oldestInWindow);
                        retryAfterSeconds = Math.Max(1, (int)Math.Ceiling(timeUntilRelease.TotalSeconds));
                        return false;
                    }
                }
            }

            // Record request
            lock (ipList)
            {
                ipList.Add(now);
            }

            if (!string.IsNullOrWhiteSpace(email))
            {
                var emailList = _emailRequests.GetOrAdd(emailKey, _ => new List<DateTime>());
                lock (emailList)
                {
                    emailList.Add(now);
                }
            }

            return true;
        }

        private static string HashEmail(string? email)
        {
            if (string.IsNullOrWhiteSpace(email)) return string.Empty;
            var normalized = email.Trim().ToLowerInvariant();
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(normalized));
            return Convert.ToHexString(bytes);
        }

        private void CleanupOldEntriesIfDue(DateTime now)
        {
            if (now - _lastCleanup < TimeSpan.FromMinutes(5)) return;

            lock (_cleanupLock)
            {
                if (now - _lastCleanup < TimeSpan.FromMinutes(5)) return;
                _lastCleanup = now;

                foreach (var kvp in _ipRequests)
                {
                    lock (kvp.Value)
                    {
                        kvp.Value.RemoveAll(t => now - t > _window);
                    }
                }

                foreach (var kvp in _emailRequests)
                {
                    lock (kvp.Value)
                    {
                        kvp.Value.RemoveAll(t => now - t > _window);
                    }
                }
            }
        }
    }
}
