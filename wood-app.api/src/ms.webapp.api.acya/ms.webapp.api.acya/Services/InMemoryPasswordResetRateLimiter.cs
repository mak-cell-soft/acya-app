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
    /// Thread-safe in-memory rate limiter for password reset requests.
    /// Limits requests per (ClientIP + Tenant) and per (TargetEmail + Tenant).
    /// Hashing is applied to emails to avoid persisting plaintext PII in memory.
    /// Note: Operates per container instance. In a clustered deployment, a distributed store (e.g. Redis)
    /// would be required for cluster-wide coordination.
    /// </summary>
    public class InMemoryPasswordResetRateLimiter : IPasswordResetRateLimiter
    {
        private readonly ConcurrentDictionary<string, List<DateTime>> _ipRequests = new();
        private readonly ConcurrentDictionary<string, List<DateTime>> _emailRequests = new();
        private readonly object _cleanupLock = new();
        private DateTime _lastCleanup = DateTime.UtcNow;

        private readonly int _maxRequestsPerIp;
        private readonly int _maxRequestsPerEmail;
        private readonly TimeSpan _window;

        public InMemoryPasswordResetRateLimiter(
            int maxRequestsPerIp = 5,
            int maxRequestsPerEmail = 3,
            int windowMinutes = 15)
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

            var ipKey = $"{tenant}:ip:{normalizedIp}";
            var emailKey = $"{tenant}:email:{emailHash}";

            // 1. Check IP limit
            var ipList = _ipRequests.GetOrAdd(ipKey, _ => new List<DateTime>());
            lock (ipList)
            {
                ipList.RemoveAll(t => now - t > _window);
                if (ipList.Count >= _maxRequestsPerIp)
                {
                    var oldestInWindow = ipList.Min();
                    var remaining = _window - (now - oldestInWindow);
                    retryAfterSeconds = Math.Max(1, (int)remaining.TotalSeconds);
                    return false;
                }
            }

            // 2. Check Email limit
            var emailList = _emailRequests.GetOrAdd(emailKey, _ => new List<DateTime>());
            lock (emailList)
            {
                emailList.RemoveAll(t => now - t > _window);
                if (emailList.Count >= _maxRequestsPerEmail)
                {
                    var oldestInWindow = emailList.Min();
                    var remaining = _window - (now - oldestInWindow);
                    retryAfterSeconds = Math.Max(1, (int)remaining.TotalSeconds);
                    return false;
                }
            }

            // Record request in both trackers
            lock (ipList)
            {
                ipList.Add(now);
            }
            lock (emailList)
            {
                emailList.Add(now);
            }

            return true;
        }

        private static string HashEmail(string email)
        {
            if (string.IsNullOrWhiteSpace(email)) return "empty";
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

                var cutoff = now - _window;
                CleanupDictionary(_ipRequests, cutoff);
                CleanupDictionary(_emailRequests, cutoff);
            }
        }

        private static void CleanupDictionary(ConcurrentDictionary<string, List<DateTime>> dict, DateTime cutoff)
        {
            foreach (var kvp in dict)
            {
                lock (kvp.Value)
                {
                    kvp.Value.RemoveAll(t => t < cutoff);
                    if (kvp.Value.Count == 0)
                    {
                        dict.TryRemove(kvp.Key, out _);
                    }
                }
            }
        }
    }
}
