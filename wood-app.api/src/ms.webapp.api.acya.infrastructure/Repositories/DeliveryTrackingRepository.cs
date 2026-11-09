using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Interfaces;

namespace ms.webapp.api.acya.infrastructure.Repositories
{
  /// <summary>
  /// Repository for managing vehicle delivery tracking records, operational KPIs,
  /// and document relationship logistics lookups.
  /// </summary>
  public class DeliveryTrackingRepository : CoreRepository<DeliveryTracking, WoodAppContext>, IDeliveryTrackingRepository
  {
    public DeliveryTrackingRepository(WoodAppContext context) : base(context)
    {
    }

    public async Task<DeliveryTracking?> GetByIdAsync(int id)
    {
      return await context.DeliveryTrackings
        .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);
    }

    public async Task<DeliveryTrackingDto?> GetDetailByIdAsync(int id)
    {
      var record = await context.DeliveryTrackings
        .Include(d => d.Document)
        .Include(d => d.Vehicle)
        .Include(d => d.Transporter)
        .Include(d => d.Customer)
        .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);

      return record != null ? MapToDto(record) : null;
    }

    public async Task<DeliveryTrackingDto?> GetByDocumentIdAsync(int documentId)
    {
      // 1. Direct active record associated with the document
      var record = await context.DeliveryTrackings
        .Include(d => d.Document)
        .Include(d => d.Vehicle)
        .Include(d => d.Transporter)
        .Include(d => d.Customer)
        .FirstOrDefaultAsync(d => d.DocumentId == documentId && !d.IsDeleted);

      if (record != null)
      {
        return MapToDto(record);
      }

      // 2. Converted document lookup: If documentId is a child document (e.g. Invoice converted from BL),
      // look up the active tracking record attached to the parent BL.
      var parentDocIds = await context.DocumentDocumentRelationships
        .Where(r => r.ChildDocumentId == documentId)
        .Select(r => r.ParentDocumentId)
        .ToListAsync();

      if (parentDocIds.Count > 0)
      {
        var parentRecord = await context.DeliveryTrackings
          .Include(d => d.Document)
          .Include(d => d.Vehicle)
          .Include(d => d.Transporter)
          .Include(d => d.Customer)
          .FirstOrDefaultAsync(d => parentDocIds.Contains(d.DocumentId) && !d.IsDeleted);

        if (parentRecord != null)
        {
          return MapToDto(parentRecord);
        }
      }

      // 3. Reverse lookup: If documentId is a parent document, check if tracking was recorded on a child
      var childDocIds = await context.DocumentDocumentRelationships
        .Where(r => r.ParentDocumentId == documentId)
        .Select(r => r.ChildDocumentId)
        .ToListAsync();

      if (childDocIds.Count > 0)
      {
        var childRecord = await context.DeliveryTrackings
          .Include(d => d.Document)
          .Include(d => d.Vehicle)
          .Include(d => d.Transporter)
          .Include(d => d.Customer)
          .FirstOrDefaultAsync(d => childDocIds.Contains(d.DocumentId) && !d.IsDeleted);

        if (childRecord != null)
        {
          return MapToDto(childRecord);
        }
      }

      return null;
    }

    public async Task<PagedResult<DeliveryTrackingListItemDto>> GetVehicleHistoryAsync(int vehicleId, DeliveryTrackingFilterDto filter)
    {
      var query = context.DeliveryTrackings
        .AsNoTracking()
        .Include(d => d.Document)
        .Include(d => d.Vehicle)
        .Include(d => d.Transporter)
        .Include(d => d.Customer)
        .Where(d => d.VehicleId == vehicleId && !d.IsDeleted);

      if (filter.StartDate.HasValue)
      {
        var startUtc = NormalizeToUtc(filter.StartDate.Value);
        query = query.Where(d => d.DepartureDate >= startUtc);
      }

      if (filter.EndDate.HasValue)
      {
        var endUtc = NormalizeToUtc(filter.EndDate.Value);
        query = query.Where(d => d.DepartureDate <= endUtc);
      }

      if (filter.Status.HasValue)
      {
        query = query.Where(d => d.Status == filter.Status.Value);
      }

      if (!string.IsNullOrWhiteSpace(filter.Search))
      {
        var search = filter.Search.Trim().ToLower();
        query = query.Where(d =>
          (d.CustomerName != null && d.CustomerName.ToLower().Contains(search)) ||
          (d.DeliveryAddress != null && d.DeliveryAddress.ToLower().Contains(search)) ||
          (d.DriverName != null && d.DriverName.ToLower().Contains(search)) ||
          (d.Document != null && d.Document.DocNumber != null && d.Document.DocNumber.ToLower().Contains(search)) ||
          (d.Notes != null && d.Notes.ToLower().Contains(search)));
      }

      int totalCount = await query.CountAsync();
      int page = filter.Page > 0 ? filter.Page : 1;
      int pageSize = filter.PageSize > 0 ? filter.PageSize : 15;

      var entities = await query
        .OrderByDescending(d => d.DepartureDate)
        .ThenByDescending(d => d.Id)
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .ToListAsync();

      var items = entities.Select(MapToListItemDto).ToList();

      return new PagedResult<DeliveryTrackingListItemDto>
      {
        Items = items,
        TotalCount = totalCount,
        PageNumber = page,
        PageSize = pageSize
      };
    }

    public async Task<PagedResult<DeliveryTrackingListItemDto>> GetCustomerHistoryAsync(int customerId, DeliveryTrackingFilterDto filter)
    {
      var query = context.DeliveryTrackings
        .AsNoTracking()
        .Include(d => d.Document)
        .Include(d => d.Vehicle)
        .Include(d => d.Transporter)
        .Include(d => d.Customer)
        .Where(d => d.CustomerId == customerId && !d.IsDeleted);

      if (filter.StartDate.HasValue)
      {
        var startUtc = NormalizeToUtc(filter.StartDate.Value);
        query = query.Where(d => d.DepartureDate >= startUtc);
      }

      if (filter.EndDate.HasValue)
      {
        var endUtc = NormalizeToUtc(filter.EndDate.Value);
        query = query.Where(d => d.DepartureDate <= endUtc);
      }

      int totalCount = await query.CountAsync();
      int page = filter.Page > 0 ? filter.Page : 1;
      int pageSize = filter.PageSize > 0 ? filter.PageSize : 15;

      var entities = await query
        .OrderByDescending(d => d.DepartureDate)
        .ThenByDescending(d => d.Id)
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .ToListAsync();

      var items = entities.Select(MapToListItemDto).ToList();

      return new PagedResult<DeliveryTrackingListItemDto>
      {
        Items = items,
        TotalCount = totalCount,
        PageNumber = page,
        PageSize = pageSize
      };
    }

    public async Task<List<FleetCustomerSummaryDto>> GetFleetCustomersAsync()
    {
      var trackings = await context.DeliveryTrackings
        .AsNoTracking()
        .Include(d => d.Customer)
        .Include(d => d.Vehicle)
        .Where(d => !d.IsDeleted)
        .ToListAsync();

      var result = trackings
        .GroupBy(d => d.CustomerId)
        .Select(g =>
        {
          var latest = g.OrderByDescending(x => x.DepartureDate).First();
          var cust = latest.Customer;
          var customerName = !string.IsNullOrWhiteSpace(latest.CustomerName)
            ? latest.CustomerName
            : (cust != null ? cust.Fullname : $"Client #{g.Key}");
          var customerAddress = !string.IsNullOrWhiteSpace(latest.DeliveryAddress)
            ? latest.DeliveryAddress
            : cust?.Address;

          return new FleetCustomerSummaryDto
          {
            CustomerId = g.Key,
            CustomerName = customerName,
            CustomerAddress = customerAddress,
            TotalDeliveries = g.Count(),
            LastDeliveryDate = latest.DepartureDate,
            LastVehicleSerialNumber = latest.Vehicle?.SerialNumber
          };
        })
        .OrderByDescending(c => c.LastDeliveryDate)
        .ToList();

      return result;
    }

    public async Task<VehicleDeliveryStatsDto> GetVehicleStatisticsAsync(int vehicleId, DateTime? startDate = null, DateTime? endDate = null)
    {
      var query = context.DeliveryTrackings
        .AsNoTracking()
        .Include(d => d.Customer)
        .Where(d => d.VehicleId == vehicleId && !d.IsDeleted);

      if (startDate.HasValue)
      {
        var startUtc = NormalizeToUtc(startDate.Value);
        query = query.Where(d => d.DepartureDate >= startUtc);
      }

      if (endDate.HasValue)
      {
        var endUtc = NormalizeToUtc(endDate.Value);
        query = query.Where(d => d.DepartureDate <= endUtc);
      }

      var deliveries = await query.ToListAsync();

      var stats = new VehicleDeliveryStatsDto
      {
        VehicleId = vehicleId,
        TotalDeliveries = deliveries.Count,
        ActiveDeliveries = deliveries.Count(d => d.Status == DeliveryTrackingStatus.InTransit || !d.ReturnDate.HasValue),
        CompletedDeliveries = deliveries.Count(d => d.Status == DeliveryTrackingStatus.Completed && d.ReturnDate.HasValue),
        CancelledDeliveries = deliveries.Count(d => d.Status == DeliveryTrackingStatus.Cancelled)
      };

      var completedDurations = deliveries
        .Where(d => d.ReturnDate.HasValue && d.ReturnDate.Value >= d.DepartureDate)
        .Select(d => (d.ReturnDate!.Value - d.DepartureDate).TotalMinutes)
        .ToList();

      if (completedDurations.Count > 0)
      {
        stats.AverageDeliveryMinutes = Math.Round(completedDurations.Average(), 1);
      }

      stats.MonthlyDeliveries = deliveries
        .GroupBy(d => d.DepartureDate.ToString("yyyy-MM"))
        .OrderBy(g => g.Key)
        .TakeLast(12)
        .Select(g => new MonthlyDeliveryCountDto
        {
          Month = g.Key,
          TotalCount = g.Count(),
          CompletedCount = g.Count(x => x.Status == DeliveryTrackingStatus.Completed || x.ReturnDate.HasValue),
          ActiveCount = g.Count(x => x.Status == DeliveryTrackingStatus.InTransit && !x.ReturnDate.HasValue)
        })
        .ToList();

      stats.TopCustomers = deliveries
        .GroupBy(d => d.CustomerId)
        .Select(g =>
        {
          var latest = g.OrderByDescending(x => x.DepartureDate).First();
          var name = !string.IsNullOrWhiteSpace(latest.CustomerName)
            ? latest.CustomerName
            : (latest.Customer != null ? latest.Customer.Fullname : $"Client #{g.Key}");

          return new TopCustomerDeliveryDto
          {
            CustomerId = g.Key,
            CustomerName = name,
            DeliveryCount = g.Count(),
            LastDeliveryDate = latest.DepartureDate
          };
        })
        .OrderByDescending(c => c.DeliveryCount)
        .ThenByDescending(c => c.LastDeliveryDate)
        .Take(10)
        .ToList();

      return stats;
    }

    public async Task<DeliveryTracking> CreateAsync(CreateDeliveryTrackingDto dto, int userId)
    {
      if (dto == null) throw new ArgumentNullException(nameof(dto));

      // 1. Vehicle validation
      var vehicle = await context.Vehicles.FirstOrDefaultAsync(v => v.Id == dto.VehicleId);
      if (vehicle == null)
      {
        throw new KeyNotFoundException($"Véhicule #{dto.VehicleId} introuvable.");
      }
      if (!vehicle.IsOwned)
      {
        throw new InvalidOperationException("Seuls les véhicules de la flotte appartenant à l'entreprise (IsOwned = true) peuvent faire l'objet d'un suivi de livraison.");
      }

      // 2. Document validation
      var document = await context.Documents.FirstOrDefaultAsync(d => d.Id == dto.DocumentId);
      if (document == null)
      {
        throw new KeyNotFoundException($"Document commercial #{dto.DocumentId} introuvable.");
      }
      if (document.Type != DocumentTypes.customerDeliveryNote && document.Type != DocumentTypes.customerInvoice)
      {
        throw new InvalidOperationException("Le suivi de livraison ne peut être associé qu'à un bon de livraison (BL) ou une facture directe.");
      }

      // 3. Duplicate check for active delivery tracking on this document
      bool exists = await ActiveTrackingExistsForDocumentAsync(dto.DocumentId);
      if (exists)
      {
        throw new InvalidOperationException($"Un suivi de livraison actif existe déjà pour le document #{dto.DocumentId}.");
      }

      // 4. Customer validation
      var customer = await context.CounterParts.FirstOrDefaultAsync(c => c.Id == dto.CustomerId);
      if (customer == null)
      {
        throw new KeyNotFoundException($"Client #{dto.CustomerId} introuvable.");
      }

      // 5. Transporter validation (if specified)
      Transporter? transporter = null;
      if (dto.TransporterId.HasValue && dto.TransporterId.Value > 0)
      {
        transporter = await context.Transporters.FirstOrDefaultAsync(t => t.Id == dto.TransporterId.Value);
        if (transporter == null)
        {
          throw new KeyNotFoundException($"Transporteur #{dto.TransporterId.Value} introuvable.");
        }
      }

      // 6. Date validation: Authoritative server UTC timestamp
      var departureUtc = (dto.DepartureDate != default && dto.DepartureDate > DateTime.MinValue)
        ? NormalizeToUtc(dto.DepartureDate)
        : DateTime.UtcNow;

      DateTime? returnUtc = null;
      if (dto.ReturnDate.HasValue)
      {
        returnUtc = NormalizeToUtc(dto.ReturnDate.Value);
        if (returnUtc.Value < departureUtc)
        {
          throw new InvalidOperationException("La date de retour ne peut pas être antérieure à la date de départ.");
        }
      }

      // 7. Snapshots resolution
      var customerName = !string.IsNullOrWhiteSpace(dto.CustomerName)
        ? dto.CustomerName.Trim()
        : customer.Fullname;

      var deliveryAddress = !string.IsNullOrWhiteSpace(dto.DeliveryAddress)
        ? dto.DeliveryAddress.Trim()
        : customer.Address;

      var driverName = !string.IsNullOrWhiteSpace(dto.DriverName)
        ? dto.DriverName.Trim()
        : (transporter?.FullName ?? vehicle.FuelCardConductor);

      var status = returnUtc.HasValue ? DeliveryTrackingStatus.Completed : DeliveryTrackingStatus.InTransit;

      var tracking = new DeliveryTracking
      {
        DocumentId = dto.DocumentId,
        VehicleId = dto.VehicleId,
        TransporterId = dto.TransporterId > 0 ? dto.TransporterId : null,
        CustomerId = dto.CustomerId,
        CustomerName = customerName,
        DriverName = driverName,
        DepartureDate = departureUtc,
        ReturnDate = returnUtc,
        DeliveryAddress = deliveryAddress,
        Status = status,
        Notes = dto.Notes,
        IsDeleted = false,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow,
        UpdatedById = userId > 0 ? userId : null
      };

      context.DeliveryTrackings.Add(tracking);
      await context.SaveChangesAsync();

      return tracking;
    }

    public async Task<DeliveryTrackingDto?> UpdateAsync(int id, UpdateDeliveryTrackingDto dto, int userId)
    {
      if (dto == null) throw new ArgumentNullException(nameof(dto));

      var tracking = await context.DeliveryTrackings
        .Include(d => d.Document)
        .Include(d => d.Vehicle)
        .Include(d => d.Transporter)
        .Include(d => d.Customer)
        .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);

      if (tracking == null)
      {
        return null;
      }

      // 1. Transporter validation if modified
      if (dto.TransporterId.HasValue)
      {
        if (dto.TransporterId.Value > 0)
        {
          var transporterExists = await context.Transporters.AnyAsync(t => t.Id == dto.TransporterId.Value);
          if (!transporterExists)
          {
            throw new KeyNotFoundException($"Transporteur #{dto.TransporterId.Value} introuvable.");
          }
          tracking.TransporterId = dto.TransporterId.Value;
        }
        else
        {
          tracking.TransporterId = null;
        }
      }

      // 2. Dates update and validation
      var departureUtc = dto.DepartureDate.HasValue 
        ? NormalizeToUtc(dto.DepartureDate.Value) 
        : tracking.DepartureDate;

      DateTime? returnUtc = tracking.ReturnDate;
      if (dto.ReturnDate.HasValue)
      {
        returnUtc = NormalizeToUtc(dto.ReturnDate.Value);
      }

      if (returnUtc.HasValue && returnUtc.Value < departureUtc)
      {
        throw new InvalidOperationException("La date de retour ne peut pas être antérieure à la date de départ.");
      }

      tracking.DepartureDate = departureUtc;
      tracking.ReturnDate = returnUtc;

      // 3. Text and driver fields
      if (dto.DriverName != null)
      {
        tracking.DriverName = dto.DriverName.Trim();
      }
      if (dto.DeliveryAddress != null)
      {
        tracking.DeliveryAddress = dto.DeliveryAddress.Trim();
      }
      if (dto.Notes != null)
      {
        tracking.Notes = dto.Notes;
      }

      // 4. Status update
      if (dto.Status.HasValue)
      {
        tracking.Status = dto.Status.Value;
      }
      else if (returnUtc.HasValue && tracking.Status == DeliveryTrackingStatus.InTransit)
      {
        tracking.Status = DeliveryTrackingStatus.Completed;
      }

      tracking.UpdatedAt = DateTime.UtcNow;
      tracking.UpdatedById = userId > 0 ? userId : null;

      await context.SaveChangesAsync();

      return MapToDto(tracking);
    }

    public async Task<bool> SoftDeleteAsync(int id, int userId)
    {
      var tracking = await context.DeliveryTrackings.FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);
      if (tracking == null)
      {
        return false;
      }

      tracking.IsDeleted = true;
      tracking.UpdatedAt = DateTime.UtcNow;
      tracking.UpdatedById = userId > 0 ? userId : null;

      await context.SaveChangesAsync();
      return true;
    }

    public async Task<DeliveryTrackingDto> CompleteDeliveryAsync(int id, int userId)
    {
      var tracking = await context.DeliveryTrackings
        .Include(d => d.Document)
        .Include(d => d.Vehicle)
        .Include(d => d.Transporter)
        .Include(d => d.Customer)
        .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted);

      if (tracking == null)
      {
        throw new KeyNotFoundException($"Suivi de livraison #{id} introuvable.");
      }

      if (tracking.Status == DeliveryTrackingStatus.Completed && tracking.ReturnDate.HasValue)
      {
        throw new InvalidOperationException("Cette livraison a déjà été clôturée.");
      }

      var nowUtc = DateTime.UtcNow;
      if (nowUtc < tracking.DepartureDate)
      {
        nowUtc = tracking.DepartureDate; // Guarantee returnDate >= departureDate
      }

      tracking.ReturnDate = nowUtc;
      tracking.Status = DeliveryTrackingStatus.Completed;
      tracking.UpdatedAt = DateTime.UtcNow;
      tracking.UpdatedById = userId > 0 ? userId : null;

      await context.SaveChangesAsync();

      return MapToDto(tracking);
    }

    public async Task<bool> ActiveTrackingExistsForDocumentAsync(int documentId)
    {
      return await context.DeliveryTrackings.AnyAsync(d => d.DocumentId == documentId && !d.IsDeleted);
    }

    #region Helper Mapping Methods

    private static DateTime NormalizeToUtc(DateTime dt)
    {
      return dt.Kind switch
      {
        DateTimeKind.Utc => dt,
        DateTimeKind.Local => dt.ToUniversalTime(),
        _ => DateTime.SpecifyKind(dt, DateTimeKind.Utc)
      };
    }

    private static int? CalculateDurationMinutes(DateTime departureDate, DateTime? returnDate)
    {
      if (returnDate.HasValue && returnDate.Value >= departureDate)
      {
        return (int)Math.Round((returnDate.Value - departureDate).TotalMinutes);
      }
      return null;
    }

    private static DeliveryTrackingDto MapToDto(DeliveryTracking entity)
    {
      return new DeliveryTrackingDto
      {
        Id = entity.Id,
        DocumentId = entity.DocumentId,
        DocNumber = entity.Document?.DocNumber,
        DocumentType = entity.Document?.Type,
        VehicleId = entity.VehicleId,
        VehicleSerialNumber = entity.Vehicle?.SerialNumber,
        VehicleBrand = entity.Vehicle?.Brand,
        TransporterId = entity.TransporterId,
        TransporterName = entity.Transporter?.FullName,
        CustomerId = entity.CustomerId,
        CustomerName = !string.IsNullOrWhiteSpace(entity.CustomerName)
          ? entity.CustomerName
          : entity.Customer?.Fullname,
        DriverName = entity.DriverName,
        DepartureDate = entity.DepartureDate,
        ReturnDate = entity.ReturnDate,
        DurationMinutes = CalculateDurationMinutes(entity.DepartureDate, entity.ReturnDate),
        DeliveryAddress = !string.IsNullOrWhiteSpace(entity.DeliveryAddress)
          ? entity.DeliveryAddress
          : entity.Customer?.Address,
        Status = entity.Status,
        Notes = entity.Notes,
        CreatedAt = entity.CreatedAt,
        UpdatedAt = entity.UpdatedAt,
        UpdatedById = entity.UpdatedById
      };
    }

    private static DeliveryTrackingListItemDto MapToListItemDto(DeliveryTracking entity)
    {
      return new DeliveryTrackingListItemDto
      {
        Id = entity.Id,
        DocumentId = entity.DocumentId,
        DocNumber = entity.Document?.DocNumber,
        DocumentType = entity.Document?.Type,
        VehicleId = entity.VehicleId,
        VehicleSerialNumber = entity.Vehicle?.SerialNumber,
        VehicleBrand = entity.Vehicle?.Brand,
        TransporterId = entity.TransporterId,
        TransporterName = entity.Transporter?.FullName,
        CustomerId = entity.CustomerId,
        CustomerName = !string.IsNullOrWhiteSpace(entity.CustomerName)
          ? entity.CustomerName
          : entity.Customer?.Fullname,
        DeliveryAddress = !string.IsNullOrWhiteSpace(entity.DeliveryAddress)
          ? entity.DeliveryAddress
          : entity.Customer?.Address,
        DepartureDate = entity.DepartureDate,
        ReturnDate = entity.ReturnDate,
        DurationMinutes = CalculateDurationMinutes(entity.DepartureDate, entity.ReturnDate),
        DriverName = entity.DriverName,
        Status = entity.Status,
        Notes = entity.Notes
      };
    }

    #endregion
  }
}

