using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using ms.webapp.api.acya.core.Interfaces;

namespace ms.webapp.api.acya.api.Services
{
    /// <summary>
    /// Thread-safe in-memory rate limiter for diagnostic push notification requests.
    /// Limits requests per (Tenant + User) pair.
    /// Operates per container instance (proportional to single-container production topology).
    /// </summary>
    public class InMemoryDeviceTestPushRateLimiter : IDeviceTestPushRateLimiter
    {
        private readonly ConcurrentDictionary<string, List<DateTime>> _userRequests = new();
        private readonly object _cleanupLock = new();
        private DateTime _lastCleanup = DateTime.UtcNow;

        private readonly int _maxRequestsPerUser;
        private readonly TimeSpan _window;

        public InMemoryDeviceTestPushRateLimiter(
            int maxRequestsPerUser = 1,
            int windowMinutes = 5)
        {
            _maxRequestsPerUser = maxRequestsPerUser;
            _window = TimeSpan.FromMinutes(windowMinutes);
        }

        public InMemoryDeviceTestPushRateLimiter(
            TimeSpan window,
            int maxRequestsPerUser = 1)
        {
            _maxRequestsPerUser = maxRequestsPerUser;
            _window = window;
        }

        public bool IsAllowed(string? tenantSlug, int userId, out int retryAfterSeconds)
        {
            var now = DateTime.UtcNow;
            retryAfterSeconds = 0;

            CleanupOldEntriesIfDue(now);

            var tenant = string.IsNullOrWhiteSpace(tenantSlug) ? "default" : tenantSlug.Trim().ToLowerInvariant();
            var userKey = $"{tenant}:user:{userId}";

            var userList = _userRequests.GetOrAdd(userKey, _ => new List<DateTime>());
            lock (userList)
            {
                userList.RemoveAll(t => now - t > _window);
                if (userList.Count >= _maxRequestsPerUser)
                {
                    var oldestInWindow = userList.Min();
                    var remaining = _window - (now - oldestInWindow);
                    retryAfterSeconds = Math.Max(1, (int)remaining.TotalSeconds);
                    return false;
                }

                userList.Add(now);
                return true;
            }
        }

        private void CleanupOldEntriesIfDue(DateTime now)
        {
            if (now - _lastCleanup < TimeSpan.FromMinutes(10))
            {
                return;
            }

            lock (_cleanupLock)
            {
                if (now - _lastCleanup < TimeSpan.FromMinutes(10))
                {
                    return;
                }

                var cutoff = now - _window;
                foreach (var kvp in _userRequests)
                {
                    lock (kvp.Value)
                    {
                        kvp.Value.RemoveAll(t => t < cutoff);
                    }
                }

                _lastCleanup = now;
            }
        }
    }
}
