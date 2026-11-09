using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.api.Services;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.infrastructure;
using ms.webapp.api.acya.infrastructure.Repositories;
using Xunit;

namespace ms.webapp.api.acya.tests
{
  public class DeliveryTrackingTests
  {
    private WoodAppContext CreateContext(string? tenantSlug = null)
    {
      var dbName = Guid.NewGuid().ToString();
      var options = new DbContextOptionsBuilder<WoodAppContext>()
        .UseInMemoryDatabase(databaseName: dbName)
        .ConfigureWarnings(x => x.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
        .Options;

      if (!string.IsNullOrEmpty(tenantSlug))
      {
        var tenantContext = new TenantContext
        {
          IsEnabled = true,
          Slug = tenantSlug,
          SchemaName = $"tenant_{tenantSlug.Replace("-", "_")}"
        };
        return new WoodAppContext(options, tenantContext);
      }

      return new WoodAppContext(options);
    }

    private static ClaimsPrincipal CreateUserPrincipal(int userId = 42, string role = "Admin")
    {
      var claims = new List<Claim>
      {
        new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
        new Claim("id", userId.ToString()),
        new Claim(ClaimTypes.Name, "testuser"),
        new Claim(ClaimTypes.Role, role)
      };
      return new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"));
    }

    private async Task<(Vehicle ownedVehicle, Vehicle externalVehicle, CounterPart customer, Document deliveryNote, Document invoice, Transporter transporter)> SeedTestDataAsync(WoodAppContext context)
    {
      var owned = new Vehicle
      {
        Id = 1,
        SerialNumber = "210 TN 4567",
        Brand = "ISUZU D-MAX",
        IsOwned = true,
        FuelCardConductor = "Moncef Trabelsi",
        FuelCardMatricule = "210 TN 4567"
      };
      var external = new Vehicle
      {
        Id = 2,
        SerialNumber = "185 TN 9876",
        Brand = "MERCEDES SPRINTER",
        IsOwned = false
      };
      context.Vehicles.AddRange(owned, external);

      var customer = new CounterPart
      {
        Id = 10,
        Name = "Ste Bois & Meubles du Sud",
        FirstName = "Ali",
        LastName = "Gharbi",
        Address = "Zone Industrielle Route de Gabes, Sfax",
        Gouvernorate = "Sfax",
        Type = CounterPartType.Customer
      };
      context.CounterParts.Add(customer);

      var bl = new Document
      {
        Id = 100,
        DocNumber = "BL26-0001",
        Type = DocumentTypes.customerDeliveryNote,
        CreationDate = DateTime.UtcNow.AddHours(-3),
        CounterPartId = customer.Id
      };
      var invoice = new Document
      {
        Id = 200,
        DocNumber = "FC26-0001",
        Type = DocumentTypes.customerInvoice,
        CreationDate = DateTime.UtcNow.AddHours(-1),
        CounterPartId = customer.Id
      };
      context.Documents.AddRange(bl, invoice);

      var transporter = new Transporter
      {
        Id = 5,
        FirstName = "Khaled",
        LastName = "Mansouri",
        FullName = "Khaled MANSOURI"
      };
      context.Transporters.Add(transporter);

      await context.SaveChangesAsync();
      return (owned, external, customer, bl, invoice, transporter);
    }

    [Fact]
    public async Task CreateAsync_WithValidOwnedVehicle_Succeeds()
    {
      using var context = CreateContext();
      var (owned, _, customer, bl, _, transporter) = await SeedTestDataAsync(context);
      var repo = new DeliveryTrackingRepository(context);

      var dto = new CreateDeliveryTrackingDto
      {
        DocumentId = bl.Id,
        VehicleId = owned.Id,
        CustomerId = customer.Id,
        TransporterId = transporter.Id,
        DriverName = "Khaled Mansouri",
        DepartureDate = DateTime.UtcNow.AddMinutes(-30),
        DeliveryAddress = "Zone Industrielle Route de Gabes, Sfax",
        Notes = "Livraison urgente bois rouge"
      };

      var tracking = await repo.CreateAsync(dto, userId: 15);

      Assert.NotNull(tracking);
      Assert.True(tracking.Id > 0);
      Assert.Equal(bl.Id, tracking.DocumentId);
      Assert.Equal(owned.Id, tracking.VehicleId);
      Assert.Equal(customer.Id, tracking.CustomerId);
      Assert.Equal(transporter.Id, tracking.TransporterId);
      Assert.Equal(DeliveryTrackingStatus.InTransit, tracking.Status);
      Assert.Null(tracking.ReturnDate);
      Assert.False(tracking.IsDeleted);
      Assert.Equal(15, tracking.UpdatedById);
    }

    [Fact]
    public async Task CreateAsync_WithReturnDate_DefaultsToCompletedStatus()
    {
      using var context = CreateContext();
      var (owned, _, customer, bl, _, _) = await SeedTestDataAsync(context);
      var repo = new DeliveryTrackingRepository(context);

      var departure = DateTime.UtcNow.AddHours(-2);
      var returnTime = DateTime.UtcNow.AddMinutes(-10);

      var dto = new CreateDeliveryTrackingDto
      {
        DocumentId = bl.Id,
        VehicleId = owned.Id,
        CustomerId = customer.Id,
        DepartureDate = departure,
        ReturnDate = returnTime
      };

      var tracking = await repo.CreateAsync(dto, userId: 1);

      Assert.NotNull(tracking);
      Assert.Equal(DeliveryTrackingStatus.Completed, tracking.Status);
      Assert.NotNull(tracking.ReturnDate);
    }

    [Fact]
    public async Task CreateAsync_WhenVehicleNotOwned_ThrowsInvalidOperationException()
    {
      using var context = CreateContext();
      var (_, external, customer, bl, _, _) = await SeedTestDataAsync(context);
      var repo = new DeliveryTrackingRepository(context);

      var dto = new CreateDeliveryTrackingDto
      {
        DocumentId = bl.Id,
        VehicleId = external.Id,
        CustomerId = customer.Id,
        DepartureDate = DateTime.UtcNow
      };

      var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => repo.CreateAsync(dto, userId: 1));
      Assert.Contains("IsOwned = true", ex.Message);
    }

    [Fact]
    public async Task CreateAsync_WhenVehicleNotFound_ThrowsKeyNotFoundException()
    {
      using var context = CreateContext();
      var (_, _, customer, bl, _, _) = await SeedTestDataAsync(context);
      var repo = new DeliveryTrackingRepository(context);

      var dto = new CreateDeliveryTrackingDto
      {
        DocumentId = bl.Id,
        VehicleId = 99999,
        CustomerId = customer.Id,
        DepartureDate = DateTime.UtcNow
      };

      await Assert.ThrowsAsync<KeyNotFoundException>(() => repo.CreateAsync(dto, userId: 1));
    }

    [Fact]
    public async Task CreateAsync_WhenDocumentNotFound_ThrowsKeyNotFoundException()
    {
      using var context = CreateContext();
      var (owned, _, customer, _, _, _) = await SeedTestDataAsync(context);
      var repo = new DeliveryTrackingRepository(context);

      var dto = new CreateDeliveryTrackingDto
      {
        DocumentId = 88888,
        VehicleId = owned.Id,
        CustomerId = customer.Id,
        DepartureDate = DateTime.UtcNow
      };

      await Assert.ThrowsAsync<KeyNotFoundException>(() => repo.CreateAsync(dto, userId: 1));
    }

    [Fact]
    public async Task CreateAsync_WhenDocumentIneligible_ThrowsInvalidOperationException()
    {
      using var context = CreateContext();
      var (owned, _, customer, _, _, _) = await SeedTestDataAsync(context);

      var quoteDoc = new Document
      {
        Id = 300,
        DocNumber = "DEVIS26-001",
        Type = DocumentTypes.customerQuote,
        CounterPartId = customer.Id
      };
      context.Documents.Add(quoteDoc);
      await context.SaveChangesAsync();

      var repo = new DeliveryTrackingRepository(context);

      var dto = new CreateDeliveryTrackingDto
      {
        DocumentId = quoteDoc.Id,
        VehicleId = owned.Id,
        CustomerId = customer.Id,
        DepartureDate = DateTime.UtcNow
      };

      var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => repo.CreateAsync(dto, userId: 1));
      Assert.Contains("bon de livraison", ex.Message);
    }

    [Fact]
    public async Task CreateAsync_WhenReturnDatePrecedesDepartureDate_ThrowsInvalidOperationException()
    {
      using var context = CreateContext();
      var (owned, _, customer, bl, _, _) = await SeedTestDataAsync(context);
      var repo = new DeliveryTrackingRepository(context);

      var dto = new CreateDeliveryTrackingDto
      {
        DocumentId = bl.Id,
        VehicleId = owned.Id,
        CustomerId = customer.Id,
        DepartureDate = DateTime.UtcNow,
        ReturnDate = DateTime.UtcNow.AddHours(-1) // Before departure!
      };

      var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => repo.CreateAsync(dto, userId: 1));
      Assert.Contains("date de retour", ex.Message);
    }

    [Fact]
    public async Task CreateAsync_WhenActiveTrackingAlreadyExists_ThrowsInvalidOperationException()
    {
      using var context = CreateContext();
      var (owned, _, customer, bl, _, _) = await SeedTestDataAsync(context);
      var repo = new DeliveryTrackingRepository(context);

      var dto1 = new CreateDeliveryTrackingDto
      {
        DocumentId = bl.Id,
        VehicleId = owned.Id,
        CustomerId = customer.Id,
        DepartureDate = DateTime.UtcNow.AddHours(-2)
      };
      await repo.CreateAsync(dto1, userId: 1);

      var dto2 = new CreateDeliveryTrackingDto
      {
        DocumentId = bl.Id,
        VehicleId = owned.Id,
        CustomerId = customer.Id,
        DepartureDate = DateTime.UtcNow
      };

      var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => repo.CreateAsync(dto2, userId: 1));
      Assert.Contains("existe déjà", ex.Message);
    }

    [Fact]
    public async Task CreateAsync_SnapshotsCustomerAndAddress_WhenOmitted()
    {
      using var context = CreateContext();
      var (owned, _, customer, bl, _, _) = await SeedTestDataAsync(context);
      var repo = new DeliveryTrackingRepository(context);

      var dto = new CreateDeliveryTrackingDto
      {
        DocumentId = bl.Id,
        VehicleId = owned.Id,
        CustomerId = customer.Id,
        DepartureDate = DateTime.UtcNow
      };

      var tracking = await repo.CreateAsync(dto, userId: 1);

      Assert.Equal(customer.Fullname, tracking.CustomerName);
      Assert.Equal(customer.Address, tracking.DeliveryAddress);
      Assert.Equal(owned.FuelCardConductor, tracking.DriverName); // Fallback to vehicle driver
    }

    [Fact]
    public async Task GetByDocumentIdAsync_DirectLookup_ReturnsTracking()
    {
      using var context = CreateContext();
      var (owned, _, customer, bl, _, _) = await SeedTestDataAsync(context);
      var repo = new DeliveryTrackingRepository(context);

      var dto = new CreateDeliveryTrackingDto
      {
        DocumentId = bl.Id,
        VehicleId = owned.Id,
        CustomerId = customer.Id,
        DepartureDate = DateTime.UtcNow.AddMinutes(-45)
      };
      var created = await repo.CreateAsync(dto, userId: 1);

      var found = await repo.GetByDocumentIdAsync(bl.Id);

      Assert.NotNull(found);
      Assert.Equal(created.Id, found.Id);
      Assert.Equal(bl.DocNumber, found.DocNumber);
      Assert.Equal(owned.SerialNumber, found.VehicleSerialNumber);
    }

    [Fact]
    public async Task GetByDocumentIdAsync_ConvertedInvoiceToBL_ResolvesParentTracking()
    {
      using var context = CreateContext();
      var (owned, _, customer, bl, invoice, _) = await SeedTestDataAsync(context);
      var repo = new DeliveryTrackingRepository(context);

      // 1. Create delivery tracking on BL
      var dto = new CreateDeliveryTrackingDto
      {
        DocumentId = bl.Id,
        VehicleId = owned.Id,
        CustomerId = customer.Id,
        DepartureDate = DateTime.UtcNow.AddHours(-1)
      };
      var tracking = await repo.CreateAsync(dto, userId: 1);

      // 2. Link Invoice to BL via DocumentDocumentRelationship (Invoice = Child, BL = Parent)
      context.DocumentDocumentRelationships.Add(new DocumentDocumentRelationship
      {
        ParentDocumentId = bl.Id,
        ChildDocumentId = invoice.Id
      });
      await context.SaveChangesAsync();

      // 3. Query tracking by the converted Invoice ID
      var foundByInvoice = await repo.GetByDocumentIdAsync(invoice.Id);

      Assert.NotNull(foundByInvoice);
      Assert.Equal(tracking.Id, foundByInvoice.Id);
      Assert.Equal(bl.Id, foundByInvoice.DocumentId);
      Assert.Equal(bl.DocNumber, foundByInvoice.DocNumber);
    }

    [Fact]
    public async Task GetVehicleHistoryAsync_WithPaginationAndFiltering_ReturnsCorrectItems()
    {
      using var context = CreateContext();
      var (owned, _, customer, bl, invoice, _) = await SeedTestDataAsync(context);
      var repo = new DeliveryTrackingRepository(context);

      var dt1 = new CreateDeliveryTrackingDto
      {
        DocumentId = bl.Id,
        VehicleId = owned.Id,
        CustomerId = customer.Id,
        DepartureDate = DateTime.UtcNow.AddDays(-5),
        ReturnDate = DateTime.UtcNow.AddDays(-5).AddHours(2),
        Notes = "Course livraison 1"
      };
      await repo.CreateAsync(dt1, userId: 1);

      var dt2 = new CreateDeliveryTrackingDto
      {
        DocumentId = invoice.Id,
        VehicleId = owned.Id,
        CustomerId = customer.Id,
        DepartureDate = DateTime.UtcNow.AddDays(-1),
        Notes = "Course livraison 2 en cours"
      };
      await repo.CreateAsync(dt2, userId: 1);

      // Filter: only last 2 days
      var filter = new DeliveryTrackingFilterDto
      {
        StartDate = DateTime.UtcNow.AddDays(-2),
        Page = 1,
        PageSize = 10
      };

      var history = await repo.GetVehicleHistoryAsync(owned.Id, filter);

      Assert.Equal(1, history.TotalCount);
      Assert.Single(history.Items);
      Assert.Equal(invoice.Id, history.Items.First().DocumentId);
      Assert.Equal(DeliveryTrackingStatus.InTransit, history.Items.First().Status);
    }

    [Fact]
    public async Task GetCustomerHistoryAsync_ReturnsOnlyThatCustomersDeliveries()
    {
      using var context = CreateContext();
      var (owned, _, customer, bl, invoice, _) = await SeedTestDataAsync(context);

      var customer2 = new CounterPart
      {
        Id = 20,
        Name = "Menuiserie Moderne",
        Type = CounterPartType.Customer
      };
      context.CounterParts.Add(customer2);

      var bl2 = new Document
      {
        Id = 102,
        DocNumber = "BL26-0002",
        Type = DocumentTypes.customerDeliveryNote,
        CounterPartId = customer2.Id
      };
      context.Documents.Add(bl2);
      await context.SaveChangesAsync();

      var repo = new DeliveryTrackingRepository(context);

      await repo.CreateAsync(new CreateDeliveryTrackingDto
      {
        DocumentId = bl.Id,
        VehicleId = owned.Id,
        CustomerId = customer.Id,
        DepartureDate = DateTime.UtcNow.AddDays(-3)
      }, 1);

      await repo.CreateAsync(new CreateDeliveryTrackingDto
      {
        DocumentId = bl2.Id,
        VehicleId = owned.Id,
        CustomerId = customer2.Id,
        DepartureDate = DateTime.UtcNow.AddDays(-1)
      }, 1);

      var historyCust1 = await repo.GetCustomerHistoryAsync(customer.Id, new DeliveryTrackingFilterDto());
      var historyCust2 = await repo.GetCustomerHistoryAsync(customer2.Id, new DeliveryTrackingFilterDto());

      Assert.Equal(1, historyCust1.TotalCount);
      Assert.Equal(bl.Id, historyCust1.Items.First().DocumentId);

      Assert.Equal(1, historyCust2.TotalCount);
      Assert.Equal(bl2.Id, historyCust2.Items.First().DocumentId);
    }

    [Fact]
    public async Task GetFleetCustomersAsync_AggregatesDistinctCustomersAndCounts()
    {
      using var context = CreateContext();
      var (owned, _, customer, bl, invoice, _) = await SeedTestDataAsync(context);
      var repo = new DeliveryTrackingRepository(context);

      await repo.CreateAsync(new CreateDeliveryTrackingDto
      {
        DocumentId = bl.Id,
        VehicleId = owned.Id,
        CustomerId = customer.Id,
        DepartureDate = DateTime.UtcNow.AddDays(-4)
      }, 1);

      await repo.CreateAsync(new CreateDeliveryTrackingDto
      {
        DocumentId = invoice.Id,
        VehicleId = owned.Id,
        CustomerId = customer.Id,
        DepartureDate = DateTime.UtcNow.AddDays(-1)
      }, 1);

      var fleetCustomers = await repo.GetFleetCustomersAsync();

      Assert.Single(fleetCustomers);
      var first = fleetCustomers.First();
      Assert.Equal(customer.Id, first.CustomerId);
      Assert.Equal(2, first.TotalDeliveries);
      Assert.Equal(owned.SerialNumber, first.LastVehicleSerialNumber);
    }

    [Fact]
    public async Task GetVehicleStatisticsAsync_ComputesAccurateKpisAndMonthlyBreakdown()
    {
      using var context = CreateContext();
      var (owned, _, customer, bl, invoice, _) = await SeedTestDataAsync(context);
      var repo = new DeliveryTrackingRepository(context);

      // Completed delivery (120 minutes)
      var dep1 = DateTime.UtcNow.AddDays(-2);
      await repo.CreateAsync(new CreateDeliveryTrackingDto
      {
        DocumentId = bl.Id,
        VehicleId = owned.Id,
        CustomerId = customer.Id,
        DepartureDate = dep1,
        ReturnDate = dep1.AddMinutes(120)
      }, 1);

      // Active delivery (ongoing)
      await repo.CreateAsync(new CreateDeliveryTrackingDto
      {
        DocumentId = invoice.Id,
        VehicleId = owned.Id,
        CustomerId = customer.Id,
        DepartureDate = DateTime.UtcNow.AddMinutes(-30)
      }, 1);

      var stats = await repo.GetVehicleStatisticsAsync(owned.Id);

      Assert.Equal(owned.Id, stats.VehicleId);
      Assert.Equal(2, stats.TotalDeliveries);
      Assert.Equal(1, stats.CompletedDeliveries);
      Assert.Equal(1, stats.ActiveDeliveries);
      Assert.Equal(0, stats.CancelledDeliveries);
      Assert.Equal(120, stats.AverageDeliveryMinutes);
      Assert.NotEmpty(stats.MonthlyDeliveries);
      Assert.Single(stats.TopCustomers);
      Assert.Equal(2, stats.TopCustomers.First().DeliveryCount);
    }

    [Fact]
    public async Task UpdateAsync_ValidData_UpdatesFieldsAndAudit()
    {
      using var context = CreateContext();
      var (owned, _, customer, bl, _, _) = await SeedTestDataAsync(context);
      var repo = new DeliveryTrackingRepository(context);

      var dep = DateTime.UtcNow.AddHours(-3);
      var created = await repo.CreateAsync(new CreateDeliveryTrackingDto
      {
        DocumentId = bl.Id,
        VehicleId = owned.Id,
        CustomerId = customer.Id,
        DepartureDate = dep
      }, 1);

      var returnTime = dep.AddHours(2);
      var updated = await repo.UpdateAsync(created.Id, new UpdateDeliveryTrackingDto
      {
        ReturnDate = returnTime,
        DriverName = "Nouveau Conducteur",
        DeliveryAddress = "Nouvelle Adresse Chantier",
        Notes = "Livraison terminée avec succès"
      }, userId: 99);

      Assert.NotNull(updated);
      Assert.Equal(returnTime, updated.ReturnDate);
      Assert.Equal(DeliveryTrackingStatus.Completed, updated.Status);
      Assert.Equal(120, updated.DurationMinutes);
      Assert.Equal("Nouveau Conducteur", updated.DriverName);
      Assert.Equal("Nouvelle Adresse Chantier", updated.DeliveryAddress);
      Assert.Equal("Livraison terminée avec succès", updated.Notes);
      Assert.Equal(99, updated.UpdatedById);
    }

    [Fact]
    public async Task UpdateAsync_WhenReturnDateBeforeDepartureDate_ThrowsInvalidOperationException()
    {
      using var context = CreateContext();
      var (owned, _, customer, bl, _, _) = await SeedTestDataAsync(context);
      var repo = new DeliveryTrackingRepository(context);

      var dep = DateTime.UtcNow.AddHours(-1);
      var created = await repo.CreateAsync(new CreateDeliveryTrackingDto
      {
        DocumentId = bl.Id,
        VehicleId = owned.Id,
        CustomerId = customer.Id,
        DepartureDate = dep
      }, 1);

      var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => repo.UpdateAsync(created.Id, new UpdateDeliveryTrackingDto
      {
        ReturnDate = dep.AddHours(-2) // Before departure
      }, userId: 1));

      Assert.Contains("date de retour", ex.Message);
    }

    [Fact]
    public async Task SoftDeleteAsync_MarksIsDeleted_AndExcludesFromHistoryAndStats()
    {
      using var context = CreateContext();
      var (owned, _, customer, bl, _, _) = await SeedTestDataAsync(context);
      var repo = new DeliveryTrackingRepository(context);

      var created = await repo.CreateAsync(new CreateDeliveryTrackingDto
      {
        DocumentId = bl.Id,
        VehicleId = owned.Id,
        CustomerId = customer.Id,
        DepartureDate = DateTime.UtcNow
      }, 1);

      var deleted = await repo.SoftDeleteAsync(created.Id, userId: 7);
      Assert.True(deleted);

      // Verify excluded from GetById
      var lookup = await repo.GetByIdAsync(created.Id);
      Assert.Null(lookup);

      // Verify excluded from Document query
      var docLookup = await repo.GetByDocumentIdAsync(bl.Id);
      Assert.Null(docLookup);

      // Verify excluded from Vehicle History
      var history = await repo.GetVehicleHistoryAsync(owned.Id, new DeliveryTrackingFilterDto());
      Assert.Equal(0, history.TotalCount);

      // Verify excluded from Statistics
      var stats = await repo.GetVehicleStatisticsAsync(owned.Id);
      Assert.Equal(0, stats.TotalDeliveries);
    }

    [Fact]
    public async Task MultiTenantIsolation_SeparateTenantsDoNotBleedData()
    {
      using var tenant1Context = CreateContext(tenantSlug: "socobois");
      using var tenant2Context = CreateContext(tenantSlug: "piqbit");

      var (v1, _, c1, bl1, _, _) = await SeedTestDataAsync(tenant1Context);
      var repo1 = new DeliveryTrackingRepository(tenant1Context);
      await repo1.CreateAsync(new CreateDeliveryTrackingDto
      {
        DocumentId = bl1.Id,
        VehicleId = v1.Id,
        CustomerId = c1.Id,
        DepartureDate = DateTime.UtcNow
      }, 1);

      var repo2 = new DeliveryTrackingRepository(tenant2Context);
      var tenant2History = await repo2.GetVehicleHistoryAsync(v1.Id, new DeliveryTrackingFilterDto());

      Assert.Equal(0, tenant2History.TotalCount);
      Assert.Empty(tenant2History.Items);
    }

    [Fact]
    public async Task Controller_GetVehicleHistory_ReturnsOk()
    {
      using var context = CreateContext();
      var (owned, _, customer, bl, _, _) = await SeedTestDataAsync(context);
      var repo = new DeliveryTrackingRepository(context);

      await repo.CreateAsync(new CreateDeliveryTrackingDto
      {
        DocumentId = bl.Id,
        VehicleId = owned.Id,
        CustomerId = customer.Id,
        DepartureDate = DateTime.UtcNow
      }, 1);

      var controller = new DeliveryTrackingController(repo, context)
      {
        ControllerContext = new ControllerContext
        {
          HttpContext = new DefaultHttpContext { User = CreateUserPrincipal() }
        }
      };

      var actionResult = await controller.GetVehicleHistory(owned.Id, new DeliveryTrackingFilterDto());
      var okResult = Assert.IsType<OkObjectResult>(actionResult.Result);
      var pagedResult = Assert.IsType<PagedResult<DeliveryTrackingListItemDto>>(okResult.Value);

      Assert.Equal(1, pagedResult.TotalCount);
    }

    [Fact]
    public async Task Controller_Create_ReturnsCreatedAtAction()
    {
      using var context = CreateContext();
      var (owned, _, customer, bl, _, _) = await SeedTestDataAsync(context);
      var repo = new DeliveryTrackingRepository(context);

      var controller = new DeliveryTrackingController(repo, context)
      {
        ControllerContext = new ControllerContext
        {
          HttpContext = new DefaultHttpContext { User = CreateUserPrincipal(userId: 88) }
        }
      };

      var dto = new CreateDeliveryTrackingDto
      {
        DocumentId = bl.Id,
        VehicleId = owned.Id,
        CustomerId = customer.Id,
        DepartureDate = DateTime.UtcNow
      };

      var actionResult = await controller.Create(dto);
      var createdResult = Assert.IsType<CreatedAtActionResult>(actionResult.Result);
      var detail = Assert.IsType<DeliveryTrackingDto>(createdResult.Value);

      Assert.Equal(bl.Id, detail.DocumentId);
      Assert.Equal(owned.Id, detail.VehicleId);
      Assert.Equal(88, detail.UpdatedById);
    }

    [Fact]
    public async Task Controller_Create_WithDuplicate_ReturnsBadRequest()
    {
      using var context = CreateContext();
      var (owned, _, customer, bl, _, _) = await SeedTestDataAsync(context);
      var repo = new DeliveryTrackingRepository(context);

      var controller = new DeliveryTrackingController(repo, context)
      {
        ControllerContext = new ControllerContext
        {
          HttpContext = new DefaultHttpContext { User = CreateUserPrincipal() }
        }
      };

      var dto = new CreateDeliveryTrackingDto
      {
        DocumentId = bl.Id,
        VehicleId = owned.Id,
        CustomerId = customer.Id,
        DepartureDate = DateTime.UtcNow
      };

      var firstResult = await controller.Create(dto);
      Assert.IsType<CreatedAtActionResult>(firstResult.Result);

      var secondResult = await controller.Create(dto);
      Assert.IsType<BadRequestObjectResult>(secondResult.Result);
    }

    [Fact]
    public async Task Controller_Delete_ReturnsNoContent()
    {
      using var context = CreateContext();
      var (owned, _, customer, bl, _, _) = await SeedTestDataAsync(context);
      var repo = new DeliveryTrackingRepository(context);

      var created = await repo.CreateAsync(new CreateDeliveryTrackingDto
      {
        DocumentId = bl.Id,
        VehicleId = owned.Id,
        CustomerId = customer.Id,
        DepartureDate = DateTime.UtcNow
      }, 1);

      var controller = new DeliveryTrackingController(repo, context)
      {
        ControllerContext = new ControllerContext
        {
          HttpContext = new DefaultHttpContext { User = CreateUserPrincipal() }
        }
      };

      var deleteResult = await controller.Delete(created.Id);
      Assert.IsType<NoContentResult>(deleteResult);

      var notFoundDelete = await controller.Delete(created.Id);
      Assert.IsType<NotFoundObjectResult>(notFoundDelete);
    }

    [Fact]
    public async Task TransporterRepository_GetAllAsync_HasNoWriteSideEffects()
    {
      using var context = CreateContext();
      // Add owned vehicles with NO matching transporter
      context.Vehicles.Add(new Vehicle
      {
        Id = 101,
        SerialNumber = "220 TN 1111",
        Brand = "ISUZU NPR",
        IsOwned = true,
        FuelCardConductor = "Nouveau Chauffeur"
      });
      await context.SaveChangesAsync();

      int initialTransporterCount = await context.Transporters.CountAsync();
      var repo = new TransporterRepository(context);

      // Act
      var results = await repo.GetAllAsync();

      // Assert: GET query must not create records in tbl_transporter
      int afterCount = await context.Transporters.CountAsync();
      Assert.Equal(initialTransporterCount, afterCount);
    }

    [Fact]
    public async Task TransporterController_Update_WhenLinkedToOwnedVehicle_ReturnsBadRequest()
    {
      using var context = CreateContext();
      var ownedVehicle = new Vehicle
      {
        Id = 50,
        SerialNumber = "200 TN 5050",
        Brand = "FIAT DUCATO",
        IsOwned = true
      };
      context.Vehicles.Add(ownedVehicle);

      var linkedTransporter = new Transporter
      {
        Id = 60,
        FirstName = "Ali",
        LastName = "BEN SALAH",
        FullName = "Ali BEN SALAH",
        VehicleId = ownedVehicle.Id
      };
      context.Transporters.Add(linkedTransporter);
      await context.SaveChangesAsync();

      var vehicleRepo = new VehicleRepository(context);
      var transRepo = new TransporterRepository(context);
      var controller = new TransporterController(transRepo, vehicleRepo, context)
      {
        ControllerContext = new ControllerContext
        {
          HttpContext = new DefaultHttpContext { User = CreateUserPrincipal() }
        }
      };

      var updateDto = new TransporterDto
      {
        id = linkedTransporter.Id,
        firstname = "Ali",
        lastname = "BEN SALAH MODIFIED"
      };

      var result = await controller.Update(linkedTransporter.Id, updateDto);
      var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
      Assert.Contains("flotte interne", badRequest.Value?.ToString() ?? "");
    }

    [Fact]
    public async Task TransporterController_Delete_WhenLinkedToOwnedVehicle_ReturnsBadRequest()
    {
      using var context = CreateContext();
      var ownedVehicle = new Vehicle
      {
        Id = 51,
        SerialNumber = "201 TN 5151",
        Brand = "IVECO DAILY",
        IsOwned = true
      };
      context.Vehicles.Add(ownedVehicle);

      var linkedTransporter = new Transporter
      {
        Id = 61,
        FirstName = "Sami",
        LastName = "TRABELSI",
        FullName = "Sami TRABELSI",
        VehicleId = ownedVehicle.Id
      };
      context.Transporters.Add(linkedTransporter);
      await context.SaveChangesAsync();

      var vehicleRepo = new VehicleRepository(context);
      var transRepo = new TransporterRepository(context);
      var controller = new TransporterController(transRepo, vehicleRepo, context)
      {
        ControllerContext = new ControllerContext
        {
          HttpContext = new DefaultHttpContext { User = CreateUserPrincipal() }
        }
      };

      var result = await controller.Delete(linkedTransporter.Id);
      var badRequest = Assert.IsType<BadRequestObjectResult>(result);
      Assert.Contains("flotte interne", badRequest.Value?.ToString() ?? "");
    }

    [Fact]
    public async Task CompleteDeliveryAsync_WhenInTransit_SetsReturnDateToUtcNowAndStatusToCompleted()
    {
      using var context = CreateContext();
      var (owned, _, customer, bl, _, _) = await SeedTestDataAsync(context);
      var repo = new DeliveryTrackingRepository(context);

      var dep = DateTime.UtcNow.AddHours(-1);
      var created = await repo.CreateAsync(new CreateDeliveryTrackingDto
      {
        DocumentId = bl.Id,
        VehicleId = owned.Id,
        CustomerId = customer.Id,
        DepartureDate = dep
      }, userId: 1);

      Assert.Equal(DeliveryTrackingStatus.InTransit, created.Status);
      Assert.Null(created.ReturnDate);

      // Act
      var completed = await repo.CompleteDeliveryAsync(created.Id, userId: 77);

      // Assert
      Assert.NotNull(completed);
      Assert.Equal(DeliveryTrackingStatus.Completed, completed.Status);
      Assert.NotNull(completed.ReturnDate);
      Assert.True(completed.ReturnDate.Value >= dep);
      Assert.NotNull(completed.DurationMinutes);
      Assert.True(completed.DurationMinutes >= 55);
      Assert.Equal(77, completed.UpdatedById);
    }

    [Fact]
    public async Task CompleteDeliveryAsync_WhenAlreadyCompleted_ThrowsInvalidOperationException()
    {
      using var context = CreateContext();
      var (owned, _, customer, bl, _, _) = await SeedTestDataAsync(context);
      var repo = new DeliveryTrackingRepository(context);

      var dep = DateTime.UtcNow.AddHours(-2);
      var ret = DateTime.UtcNow.AddHours(-1);
      var created = await repo.CreateAsync(new CreateDeliveryTrackingDto
      {
        DocumentId = bl.Id,
        VehicleId = owned.Id,
        CustomerId = customer.Id,
        DepartureDate = dep,
        ReturnDate = ret
      }, userId: 1);

      var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => repo.CompleteDeliveryAsync(created.Id, userId: 1));
      Assert.Contains("déjà été clôturée", ex.Message);
    }

    [Fact]
    public async Task Controller_Complete_ReturnsOk()
    {
      using var context = CreateContext();
      var (owned, _, customer, bl, _, _) = await SeedTestDataAsync(context);
      var repo = new DeliveryTrackingRepository(context);

      var created = await repo.CreateAsync(new CreateDeliveryTrackingDto
      {
        DocumentId = bl.Id,
        VehicleId = owned.Id,
        CustomerId = customer.Id,
        DepartureDate = DateTime.UtcNow.AddMinutes(-40)
      }, userId: 1);

      var controller = new DeliveryTrackingController(repo, context)
      {
        ControllerContext = new ControllerContext
        {
          HttpContext = new DefaultHttpContext { User = CreateUserPrincipal(userId: 44) }
        }
      };

      var actionResult = await controller.Complete(created.Id);
      var okResult = Assert.IsType<OkObjectResult>(actionResult.Result);
      var detail = Assert.IsType<DeliveryTrackingDto>(okResult.Value);

      Assert.Equal(DeliveryTrackingStatus.Completed, detail.Status);
      Assert.NotNull(detail.ReturnDate);
      Assert.Equal(44, detail.UpdatedById);
    }

    [Fact]
    public async Task TransporterController_Delete_WhenNotFound_ReturnsNotFound()
    {
      using var context = CreateContext();
      var vehicleRepo = new VehicleRepository(context);
      var transRepo = new TransporterRepository(context);
      var controller = new TransporterController(transRepo, vehicleRepo, context)
      {
        ControllerContext = new ControllerContext
        {
          HttpContext = new DefaultHttpContext { User = CreateUserPrincipal() }
        }
      };

      var result = await controller.Delete(9999);
      Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task TransporterController_Delete_WhenExternalTransporter_DeletesRecordAndReturnsOk()
    {
      using var context = CreateContext();
      var extVehicle = new Vehicle
      {
        Id = 201,
        Brand = "Peugeot Partner",
        SerialNumber = "123 TU 456",
        IsOwned = false
      };
      context.Vehicles.Add(extVehicle);

      var extTransporter = new Transporter
      {
        Id = 202,
        FirstName = "Ali",
        LastName = "BEN SALAH",
        FullName = "Ali BEN SALAH",
        VehicleId = extVehicle.Id
      };
      context.Transporters.Add(extTransporter);
      await context.SaveChangesAsync();

      var vehicleRepo = new VehicleRepository(context);
      var transRepo = new TransporterRepository(context);
      var controller = new TransporterController(transRepo, vehicleRepo, context)
      {
        ControllerContext = new ControllerContext
        {
          HttpContext = new DefaultHttpContext { User = CreateUserPrincipal() }
        }
      };

      var result = await controller.Delete(extTransporter.Id);
      Assert.IsType<OkResult>(result);

      // Verify actually removed from context
      var inDb = await context.Transporters.FindAsync(extTransporter.Id);
      Assert.Null(inDb);
    }

    [Fact]
    public async Task TransporterRepository_GetAllAsync_ExcludesTransportersLinkedToOwnedVehicles()
    {
      using var context = CreateContext();
      var ownedVehicle = new Vehicle
      {
        Id = 301,
        Brand = "ISUZU Dmax",
        SerialNumber = "6238 TU 193",
        IsOwned = true
      };
      var extVehicle = new Vehicle
      {
        Id = 302,
        Brand = "Renault Master",
        SerialNumber = "999 TU 111",
        IsOwned = false
      };
      context.Vehicles.AddRange(ownedVehicle, extVehicle);

      var legacyOwnedTransporter = new Transporter
      {
        Id = 303,
        FirstName = "Med ali",
        LastName = "TALHAOUI",
        FullName = "Med ali TALHAOUI",
        VehicleId = ownedVehicle.Id
      };
      var validExternalTransporter = new Transporter
      {
        Id = 304,
        FirstName = "Karim",
        LastName = "BEN ALI",
        FullName = "Karim BEN ALI",
        VehicleId = extVehicle.Id
      };
      var transporterWithoutVehicle = new Transporter
      {
        Id = 305,
        FirstName = "Salah",
        LastName = "GHARBI",
        FullName = "Salah GHARBI",
        VehicleId = null
      };
      context.Transporters.AddRange(legacyOwnedTransporter, validExternalTransporter, transporterWithoutVehicle);
      await context.SaveChangesAsync();

      var transRepo = new TransporterRepository(context);
      var results = (await transRepo.GetAllAsync()).ToList();

      Assert.DoesNotContain(results, t => t.id == legacyOwnedTransporter.Id);
      Assert.Contains(results, t => t.id == validExternalTransporter.Id);
      Assert.Contains(results, t => t.id == transporterWithoutVehicle.Id);
    }

    [Fact]
    public async Task CoreRepository_Delete_ReturnsEntityOnSuccess_AndNullWhenNotFound()
    {
      using var context = CreateContext();
      var vehicle = new Vehicle
      {
        Id = 401,
        Brand = "Test Van",
        SerialNumber = "555 TU 666",
        IsOwned = false
      };
      context.Vehicles.Add(vehicle);
      await context.SaveChangesAsync();

      var repo = new VehicleRepository(context);

      // Act 1: delete existing
      var deleted = await repo.Delete(vehicle.Id);
      Assert.NotNull(deleted);
      Assert.Equal(vehicle.Id, deleted.Id);

      // Act 2: delete non-existing
      var notFound = await repo.Delete(9999);
      Assert.Null(notFound);
    }
  }
}

