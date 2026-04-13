using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.infrastructure.Core;
using System.Security.Claims;

namespace ms.webapp.api.acya.infrastructure.Configurations.Audit
{
  /**
  * SaveChangesInterceptor that handles the Audit Trail logic.
  * Externalized from WoodAppContext for cleaner architecture.
  */
  public class AuditTrailInterceptor : SaveChangesInterceptor
  {
    private readonly IHttpContextAccessor? _httpContextAccessor;
    private List<AuditEntry> _tempAuditEntries = new();

    public AuditTrailInterceptor(IHttpContextAccessor? httpContextAccessor)
    {
      _httpContextAccessor = httpContextAccessor;
    }

    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
      if (eventData.Context == null) return result;
      OnBeforeSaveChanges(eventData.Context);
      return result;
    }

    public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
      if (eventData.Context == null) return result;
      OnBeforeSaveChanges(eventData.Context);
      return result;
    }

    public override int SavedChanges(SaveChangesCompletedEventData eventData, int result)
    {
      if (eventData.Context == null) return result;
      OnAfterSaveChanges(eventData.Context).GetAwaiter().GetResult();
      return result;
    }

    public override async ValueTask<int> SavedChangesAsync(SaveChangesCompletedEventData eventData, int result, CancellationToken cancellationToken = default)
    {
      if (eventData.Context == null) return result;
      await OnAfterSaveChanges(eventData.Context);
      return result;
    }

    private void OnBeforeSaveChanges(DbContext context)
    {
      context.ChangeTracker.DetectChanges();
      _tempAuditEntries = new List<AuditEntry>();

      int? userId = null;
      string? userName = null;

      if (_httpContextAccessor?.HttpContext?.User != null)
      {
        var idClaim = _httpContextAccessor.HttpContext.User.FindFirst(ClaimTypes.NameIdentifier);
        if (idClaim != null && int.TryParse(idClaim.Value, out var id))
        {
          userId = id;
        }
        userName = _httpContextAccessor.HttpContext.User.FindFirst(ClaimTypes.Name)?.Value 
                   ?? _httpContextAccessor.HttpContext.User.FindFirst("name")?.Value
                   ?? _httpContextAccessor.HttpContext.User.Identity?.Name;
      }

      foreach (var entry in context.ChangeTracker.Entries())
      {
        if (entry.Entity is AuditLog || entry.State == EntityState.Detached || entry.State == EntityState.Unchanged)
          continue;

        if (entry.Entity is not IAuditable)
          continue;

        var auditEntry = new AuditEntry(entry)
        {
          TableName = entry.Metadata.GetTableName() ?? entry.Entity.GetType().Name,
          UserId = userId,
          UserName = userName
        };
        _tempAuditEntries.Add(auditEntry);

        foreach (var property in entry.Properties)
        {
          string propertyName = property.Metadata.Name;
          if (property.Metadata.IsPrimaryKey())
          {
            auditEntry.KeyValues[propertyName] = property.CurrentValue;
            continue;
          }

          switch (entry.State)
          {
            case EntityState.Added:
              auditEntry.NewValues[propertyName] = property.CurrentValue;
              break;

            case EntityState.Deleted:
              auditEntry.OldValues[propertyName] = property.OriginalValue;
              break;

            case EntityState.Modified:
              if (property.IsModified)
              {
                auditEntry.ChangedColumns.Add(propertyName);
                auditEntry.OldValues[propertyName] = property.OriginalValue;
                auditEntry.NewValues[propertyName] = property.CurrentValue;
              }
              break;
          }
        }
      }

      // Handle immediate logs (Updates and Deletes)
      var immediateLogs = _tempAuditEntries.Where(_ => entryIsPersistent(_.Entry)).Select(_ => _.ToAuditLog()).ToList();
      if (immediateLogs.Any())
      {
        context.Set<AuditLog>().AddRange(immediateLogs);
      }

      // Filter out entries that need post-save ID capture (Added entities)
      _tempAuditEntries = _tempAuditEntries.Where(_ => !entryIsPersistent(_.Entry)).ToList();
    }

    private bool entryIsPersistent(EntityEntry entry) => entry.State != EntityState.Added;

    private async Task OnAfterSaveChanges(DbContext context)
    {
      if (_tempAuditEntries == null || _tempAuditEntries.Count == 0)
        return;

      foreach (var auditEntry in _tempAuditEntries)
      {
        foreach (var prop in auditEntry.Entry.Properties)
        {
          if (prop.Metadata.IsPrimaryKey())
          {
            auditEntry.KeyValues[prop.Metadata.Name] = prop.CurrentValue;
          }
        }
        context.Set<AuditLog>().Add(auditEntry.ToAuditLog());
      }

      _tempAuditEntries.Clear();
      await context.SaveChangesAsync();
    }
  }
}
