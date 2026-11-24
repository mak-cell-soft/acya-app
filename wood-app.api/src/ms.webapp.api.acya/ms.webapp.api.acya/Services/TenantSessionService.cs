using System;
using System.Collections.Concurrent;
using System.Data;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Logging;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.infrastructure;

namespace ms.webapp.api.acya.api.Services
{
  public class SessionAcquisitionResult
  {
    public bool IsAllowed { get; set; }
    public string? SessionId { get; set; }
    public int ConnectedUsers { get; set; }
    public int MaxConnectedUsers { get; set; }
    public int AvailableSlots { get; set; }
    public string? ErrorMessage { get; set; }
  }

  public interface ITenantSessionService
  {
    Task<SessionAcquisitionResult> TryAcquireSessionAsync(
        string tenantSlug,
        int userId,
        string username,
        TimeSpan sessionLifetime,
        CancellationToken cancellationToken = default);

    Task<bool> RevokeSessionAsync(
        string sessionId,
        string? tenantSlug = null,
        CancellationToken cancellationToken = default);

    Task<bool> ValidateSessionActiveAsync(
        string sessionId,
        string tenantSlug,
        CancellationToken cancellationToken = default);

    Task<int> GetActiveSessionCountAsync(
        string tenantSlug,
        CancellationToken cancellationToken = default);
  }

  /// <summary>
  /// Manages concurrent authenticated sessions per tenant with atomic distributed concurrency control.
  /// Combines in-process SemaphoreSlim synchronization with PostgreSQL transaction-scoped advisory locks
  /// (pg_advisory_xact_lock) so that multiple API instances cannot exceed MaxConnectedUsers (default 5).
  /// Never disconnects existing valid sessions if an administrator lowers the limit below current active sessions.
  /// </summary>
  public class TenantSessionService : ITenantSessionService
  {
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> _tenantLocks =
        new(StringComparer.OrdinalIgnoreCase);

    private readonly MasterDbContext _masterDb;
    private readonly ILogger<TenantSessionService>? _logger;

    public TenantSessionService(MasterDbContext masterDb, ILogger<TenantSessionService>? logger = null)
    {
      _masterDb = masterDb;
      _logger = logger;
    }

    /// <summary>
    /// Begins a database transaction and acquires a PostgreSQL transaction-scoped advisory lock for the tenant.
    /// Ensures distributed mutual exclusion across multiple API instances during session slot acquisition.
    /// Returns null when running under non-relational providers (e.g. EF Core InMemory in unit tests).
    /// Virtual to allow deterministic unit testing of relational lock failure handling.
    /// </summary>
    protected virtual async Task<IDbContextTransaction?> BeginDistributedTenantLockTransactionAsync(
        string normalizedSlug,
        CancellationToken cancellationToken)
    {
      if (!_masterDb.Database.IsRelational())
      {
        return null;
      }

      var transaction = await _masterDb.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, cancellationToken);
      await _masterDb.Database.ExecuteSqlRawAsync(
          "SELECT pg_advisory_xact_lock(hashtext('acya_tenant_session_' || {0}));",
          new object[] { normalizedSlug },
          cancellationToken);

      return transaction;
    }

    public async Task<SessionAcquisitionResult> TryAcquireSessionAsync(
        string tenantSlug,
        int userId,
        string username,
        TimeSpan sessionLifetime,
        CancellationToken cancellationToken = default)
    {
      if (string.IsNullOrWhiteSpace(tenantSlug))
      {
        return new SessionAcquisitionResult
        {
          IsAllowed = true,
          SessionId = Guid.NewGuid().ToString("N"),
          ConnectedUsers = 1,
          MaxConnectedUsers = 5,
          AvailableSlots = 4
        };
      }

      var normalizedSlug = tenantSlug.Trim().ToLowerInvariant();
      var gate = _tenantLocks.GetOrAdd(normalizedSlug, _ => new SemaphoreSlim(1, 1));

      await gate.WaitAsync(cancellationToken);
      IDbContextTransaction? transaction = null;

      try
      {
        // FAIL-CLOSED distributed lock: acquire PostgreSQL transaction-scoped advisory lock
        try
        {
          transaction = await BeginDistributedTenantLockTransactionAsync(normalizedSlug, cancellationToken);
        }
        catch (OperationCanceledException)
        {
          throw;
        }
        catch (Exception ex)
        {
          _logger?.LogError(ex, "Failed to acquire PostgreSQL transaction advisory lock for tenant '{Tenant}'. Aborting session acquisition (fail-closed).", normalizedSlug);
          if (transaction != null)
          {
            try { await transaction.RollbackAsync(cancellationToken); } catch { }
            await transaction.DisposeAsync();
            transaction = null;
          }

          return new SessionAcquisitionResult
          {
            IsAllowed = false,
            ErrorMessage = "Service temporairement occupé lors de la vérification des sessions. Veuillez réessayer."
          };
        }

        var nowUtc = DateTime.UtcNow;

        var tenant = await _masterDb.TenantRegistries
            .FirstOrDefaultAsync(t => t.Slug.ToLower() == normalizedSlug, cancellationToken);

        if (tenant == null)
        {
          return new SessionAcquisitionResult
          {
            IsAllowed = false,
            ErrorMessage = $"Tenant '{normalizedSlug}' non trouvé."
          };
        }

        if (!tenant.IsActive || string.Equals(tenant.Status, "Suspended", StringComparison.OrdinalIgnoreCase))
        {
          return new SessionAcquisitionResult
          {
            IsAllowed = false,
            ErrorMessage = "your company is disabled contact administrator"
          };
        }

        int maxUsers = tenant.MaxConnectedUsers > 0 ? tenant.MaxConnectedUsers : 5;

        // 1. Clean up expired sessions for this tenant so stale rows never block slots
        var expiredSessions = await _masterDb.TenantActiveSessions
            .Where(s => s.TenantId == tenant.Id && !s.IsRevoked && s.ExpiresAt <= nowUtc)
            .ToListAsync(cancellationToken);

        if (expiredSessions.Count > 0)
        {
          foreach (var expired in expiredSessions)
          {
            expired.IsRevoked = true;
            expired.RevokedAt = nowUtc;
          }
          await _masterDb.SaveChangesAsync(cancellationToken);
        }

        // 2. Count currently valid concurrent authenticated sessions (excluding expired and revoked)
        int activeCount = await _masterDb.TenantActiveSessions
            .CountAsync(s => s.TenantId == tenant.Id && !s.IsRevoked && s.ExpiresAt > nowUtc, cancellationToken);

        // 3. Enforce configured connection limit
        if (activeCount >= maxUsers)
        {
          if (transaction != null)
          {
            await transaction.CommitAsync(cancellationToken);
          }

          _logger?.LogWarning(
              "Concurrent connection limit reached for tenant '{TenantSlug}': {ActiveCount}/{MaxUsers} active sessions.",
              normalizedSlug, activeCount, maxUsers);

          return new SessionAcquisitionResult
          {
            IsAllowed = false,
            ConnectedUsers = activeCount,
            MaxConnectedUsers = maxUsers,
            AvailableSlots = 0,
            ErrorMessage = $"Limite de connexions simultanées atteinte ({activeCount}/{maxUsers} utilisateurs connectés). Veuillez réessayer lorsqu'une session se libère ou contacter votre administrateur."
          };
        }

        // 4. Register new authenticated session inside the locked transaction
        var sessionId = Guid.NewGuid().ToString("N");
        var session = new TenantActiveSession
        {
          SessionId = sessionId,
          TenantId = tenant.Id,
          TenantSlug = tenant.Slug,
          UserId = userId,
          Username = string.IsNullOrWhiteSpace(username) ? $"user-{userId}" : username.Trim(),
          CreatedAt = nowUtc,
          ExpiresAt = nowUtc.Add(sessionLifetime),
          LastActivityAt = nowUtc,
          IsRevoked = false
        };

        await _masterDb.TenantActiveSessions.AddAsync(session, cancellationToken);
        await _masterDb.SaveChangesAsync(cancellationToken);

        if (transaction != null)
        {
          await transaction.CommitAsync(cancellationToken);
        }

        int newActiveCount = activeCount + 1;
        return new SessionAcquisitionResult
        {
          IsAllowed = true,
          SessionId = sessionId,
          ConnectedUsers = newActiveCount,
          MaxConnectedUsers = maxUsers,
          AvailableSlots = Math.Max(0, maxUsers - newActiveCount)
        };
      }
      finally
      {
        if (transaction != null)
        {
          await transaction.DisposeAsync();
        }
        gate.Release();
      }
    }

    public async Task<bool> RevokeSessionAsync(
        string sessionId,
        string? tenantSlug = null,
        CancellationToken cancellationToken = default)
    {
      if (string.IsNullOrWhiteSpace(sessionId)) return false;

      var query = _masterDb.TenantActiveSessions.Where(s => s.SessionId == sessionId);
      if (!string.IsNullOrWhiteSpace(tenantSlug))
      {
        var normalized = tenantSlug.Trim().ToLowerInvariant();
        query = query.Where(s => s.TenantSlug.ToLower() == normalized);
      }

      var session = await query.FirstOrDefaultAsync(cancellationToken);
      if (session == null || session.IsRevoked)
      {
        return false;
      }

      session.IsRevoked = true;
      session.RevokedAt = DateTime.UtcNow;
      await _masterDb.SaveChangesAsync(cancellationToken);
      return true;
    }

    public async Task<bool> ValidateSessionActiveAsync(
        string sessionId,
        string tenantSlug,
        CancellationToken cancellationToken = default)
    {
      if (string.IsNullOrWhiteSpace(sessionId) || string.IsNullOrWhiteSpace(tenantSlug))
      {
        return true;
      }

      var normalizedSlug = tenantSlug.Trim().ToLowerInvariant();
      var session = await _masterDb.TenantActiveSessions
          .AsNoTracking()
          .FirstOrDefaultAsync(s => s.SessionId == sessionId && s.TenantSlug.ToLower() == normalizedSlug, cancellationToken);

      if (session == null)
      {
        // Legacy token or token issued before session tracking table was populated
        return true;
      }

      if (session.IsRevoked || session.ExpiresAt <= DateTime.UtcNow)
      {
        return false;
      }

      return true;
    }

    public async Task<int> GetActiveSessionCountAsync(
        string tenantSlug,
        CancellationToken cancellationToken = default)
    {
      if (string.IsNullOrWhiteSpace(tenantSlug)) return 0;
      var normalizedSlug = tenantSlug.Trim().ToLowerInvariant();
      var nowUtc = DateTime.UtcNow;

      return await _masterDb.TenantActiveSessions
          .AsNoTracking()
          .CountAsync(s => s.TenantSlug.ToLower() == normalizedSlug && !s.IsRevoked && s.ExpiresAt > nowUtc, cancellationToken);
    }
  }
}
