using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.api.Interfaces;
using ms.webapp.api.acya.api.Services;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.Categories;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Entities.Product;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure;
using ms.webapp.api.acya.infrastructure.Repositories;
using Xunit;

namespace ms.webapp.api.acya.tests
{
  public class DocumentTransporterVehicleIntegrationTests
  {
    private readonly WoodAppContext _context;
    private readonly StockRepository _stockRepository;
    private readonly MerchandiseRepository _merchandiseRepository;
    private readonly DocumentRepository _documentRepository;
    private readonly Mock<IAccountService> _accountServiceMock;
    private readonly Mock<IBalanceService> _balanceServiceMock;
    private readonly Mock<IApprovalService> _approvalServiceMock;
    private readonly Mock<IPdfGenerationService> _pdfServiceMock;
    private readonly Mock<IAppNotificationService> _notificationServiceMock;
    private readonly Mock<IEmailService> _emailServiceMock;

    public DocumentTransporterVehicleIntegrationTests()
    {
      var options = new DbContextOptionsBuilder<WoodAppContext>()
          .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
          .ConfigureWarnings(x => x.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
          .Options;

      _context = new WoodAppContext(options);

      var docMerchRepo = new DocumentMerchandiseRepository(_context);
      _stockRepository = new StockRepository(_context, docMerchRepo);
      _merchandiseRepository = new MerchandiseRepository(_context);
      _documentRepository = new DocumentRepository(_context, _stockRepository);

      _accountServiceMock = new Mock<IAccountService>();
      _balanceServiceMock = new Mock<IBalanceService>();
      _approvalServiceMock = new Mock<IApprovalService>();
      _pdfServiceMock = new Mock<IPdfGenerationService>();
      _notificationServiceMock = new Mock<IAppNotificationService>();
      _emailServiceMock = new Mock<IEmailService>();
    }

    private DocumentController CreateDocumentController(int userId = 1)
    {
      var controller = new DocumentController(
          _documentRepository,
          _merchandiseRepository,
          _stockRepository,
          _context,
          _accountServiceMock.Object,
          _balanceServiceMock.Object,
          _approvalServiceMock.Object,
          _pdfServiceMock.Object,
          _notificationServiceMock.Object,
          _emailServiceMock.Object
      );

      var userPrincipal = new ClaimsPrincipal(new ClaimsIdentity(new[]
      {
        new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
        new Claim("id", userId.ToString()),
        new Claim(ClaimTypes.Role, "Admin")
      }, "TestAuth"));

      controller.ControllerContext = new ControllerContext
      {
        HttpContext = new DefaultHttpContext { User = userPrincipal }
      };

      return controller;
    }

    private async Task<(AppUser user, CounterPart customer, SalesSite salesSite, Article article, Merchandise merchandise)> SeedBasicDataAsync()
    {
      var user = new AppUser
      {
        Id = 1,
        Login = "admin",
        Email = "admin@acya.site",
        IsActive = true
      };
      _context.AppUsers.Add(user);

      var salesSite = new SalesSite
      {
        Id = 1,
        Address = "Dépôt Sousse",
        Gouvernorate = "Sousse"
      };
      _context.SalesSites.Add(salesSite);

      var parent = new Parent
      {
        Id = 1,
        Reference = "CAT-BOIS",
        Description = "Bois"
      };
      _context.Parents.Add(parent);

      var firstChild = new FirstChild
      {
        Id = 1,
        Reference = "SUBCAT-SAPIN",
        Description = "Sapin",
        IdParent = 1,
        Parents = parent
      };
      _context.FirstChildren.Add(firstChild);

      var customer = new CounterPart
      {
        Id = 11,
        Name = "FOUBOIS_1",
        Type = CounterPartType.Customer,
        TransporterId = null
      };
      _context.CounterParts.Add(customer);

      var article = new Article
      {
        Id = 101,
        Reference = "ART-01",
        Description = "Bois Rouge",
        Type = ArticleType.Merchandise,
        SellPriceHT = 100,
        ParentId = 1,
        Parents = parent,
        FirstChildId = 1,
        FirstChildren = firstChild
      };
      _context.Articles.Add(article);

      var merchandise = new Merchandise
      {
        Id = 201,
        ArticleId = article.Id,
        Articles = article,
        Description = "Colis 01",
        PackageReference = "COLIS-01",
        AllowNegativStock = true
      };
      _context.Merchandises.Add(merchandise);

      var stock = new Stock
      {
        Id = 1,
        SalesSiteId = salesSite.Id,
        SalesSites = salesSite,
        MerchandiseId = merchandise.Id,
        Merchandises = merchandise,
        Quantity = 100,
        Type = TransactionType.Add,
        UpdatedById = user.Id
      };
      _context.Stocks.Add(stock);

      await _context.SaveChangesAsync();
      return (user, customer, salesSite, article, merchandise);
    }

    [Fact]
    public async Task AddDocument_WithInternalVehicleIdAsTransporterId_DoesNotOverwriteCustomerTransporter()
    {
      // Arrange
      var (user, customer, salesSite, article, merchandise) = await SeedBasicDataAsync();

      // Seed internal owned vehicle #3 in tbl_vehicle (no transporter #3 exists)
      var vehicle = new Vehicle
      {
        Id = 3,
        Brand = "ISUZU Dmax",
        SerialNumber = "9685 TU 145",
        IsOwned = true
      };
      _context.Vehicles.Add(vehicle);
      await _context.SaveChangesAsync();

      var controller = CreateDocumentController(user.Id);

      var docDto = new DocumentDto
      {
        type = DocumentTypes.customerDeliveryNote,
        updatedbyid = user.Id,
        sales_site = new SiteDto { id = salesSite.Id },
        docnumber = "BL-TEST-001",
        counterpart = new CounterPartDto
        {
          id = customer.Id,
          name = customer.Name,
          // Internal vehicle ID sent as transporterid by mistake
          transporterid = 3
        },
        merchandises = new[]
        {
          new MerchandiseDto
          {
            id = merchandise.Id,
            article = new ArticleDto { id = article.Id, reference = article.Reference },
            cost_ht = 100,
            unit_price_ht = 100,
            quantity = 1,
            line_type = LineType.Merchandise
          }
        }
      };

      // Act
      var result = await controller.Add(docDto);

      if (result is ObjectResult obj && (obj.StatusCode == null || obj.StatusCode != 200))
      {
        throw new Exception($"Add failed with status {obj.StatusCode}: {obj.Value}");
      }

      // Assert: Document creation must succeed without HTTP 500
      Assert.IsType<OkObjectResult>(result);

      // Customer's TransporterId must NOT be set to vehicle ID 3
      var updatedCustomer = await _context.CounterParts.FindAsync(customer.Id);
      Assert.NotNull(updatedCustomer);
      Assert.Null(updatedCustomer.TransporterId);
    }

    [Fact]
    public async Task AddDocument_WithExternalTransporterId_CorrectlyUpdatesCustomerTransporter()
    {
      // Arrange
      var (user, customer, salesSite, article, merchandise) = await SeedBasicDataAsync();

      // Seed valid external transporter #1
      var transporter = new Transporter
      {
        Id = 1,
        FullName = "Younes HZEMI"
      };
      _context.Transporters.Add(transporter);
      await _context.SaveChangesAsync();

      var controller = CreateDocumentController(user.Id);

      var docDto = new DocumentDto
      {
        type = DocumentTypes.customerDeliveryNote,
        updatedbyid = user.Id,
        sales_site = new SiteDto { id = salesSite.Id },
        docnumber = "BL-TEST-002",
        counterpart = new CounterPartDto
        {
          id = customer.Id,
          name = customer.Name,
          transporterid = 1
        },
        merchandises = new[]
        {
          new MerchandiseDto
          {
            id = merchandise.Id,
            article = new ArticleDto { id = article.Id, reference = article.Reference },
            cost_ht = 100,
            unit_price_ht = 100,
            quantity = 1,
            line_type = LineType.Merchandise
          }
        }
      };

      // Act
      var result = await controller.Add(docDto);

      if (result is ObjectResult obj && (obj.StatusCode == null || obj.StatusCode != 200))
      {
        throw new Exception($"Add failed with status {obj.StatusCode}: {obj.Value}");
      }

      // Assert
      Assert.IsType<OkObjectResult>(result);

      var updatedCustomer = await _context.CounterParts.FindAsync(customer.Id);
      Assert.NotNull(updatedCustomer);
      Assert.Equal(1, updatedCustomer.TransporterId);
    }

    [Fact]
    public async Task AddDocument_WithNonexistentTransporterId_PreservesExistingCustomerTransporter()
    {
      // Arrange
      var (user, customer, salesSite, article, merchandise) = await SeedBasicDataAsync();

      // Customer already has transporter #1
      var transporter1 = new Transporter { Id = 1, FullName = "Existing Transporter" };
      _context.Transporters.Add(transporter1);
      customer.TransporterId = 1;
      await _context.SaveChangesAsync();

      var controller = CreateDocumentController(user.Id);

      var docDto = new DocumentDto
      {
        type = DocumentTypes.customerDeliveryNote,
        updatedbyid = user.Id,
        sales_site = new SiteDto { id = salesSite.Id },
        docnumber = "BL-TEST-003",
        counterpart = new CounterPartDto
        {
          id = customer.Id,
          name = customer.Name,
          transporterid = 9999 // Nonexistent ID
        },
        merchandises = new[]
        {
          new MerchandiseDto
          {
            id = merchandise.Id,
            article = new ArticleDto { id = article.Id, reference = article.Reference },
            cost_ht = 100,
            unit_price_ht = 100,
            quantity = 1,
            line_type = LineType.Merchandise
          }
        }
      };

      // Act
      var result = await controller.Add(docDto);

      if (result is BadRequestObjectResult br)
      {
        throw new Exception($"BadRequest returned: {br.Value}");
      }

      // Assert: Document created without 500 error
      Assert.IsType<OkObjectResult>(result);

      // Existing transporter must be preserved, not overwritten with invalid 9999
      var updatedCustomer = await _context.CounterParts.FindAsync(customer.Id);
      Assert.NotNull(updatedCustomer);
      Assert.Equal(1, updatedCustomer.TransporterId);
    }

    [Fact]
    public async Task UpdateDocument_WithInternalVehicleTransporterId_PreservesCustomerTransporter()
    {
      // Arrange
      var (user, customer, salesSite, article, merchandise) = await SeedBasicDataAsync();

      var transporter1 = new Transporter { Id = 1, FullName = "Existing Transporter" };
      _context.Transporters.Add(transporter1);
      customer.TransporterId = 1;

      var doc = new Document
      {
        DocNumber = "BL-TEST-050",
        Type = DocumentTypes.customerDeliveryNote,
        CounterPartId = customer.Id,
        CounterPart = customer,
        SalesSiteId = salesSite.Id,
        SalesSite = salesSite,
        UpdatedById = user.Id,
        CreationDate = DateTime.UtcNow
      };
      _context.Documents.Add(doc);
      await _context.SaveChangesAsync();

      var controller = CreateDocumentController(user.Id);

      var updateDto = new DocumentDto
      {
        id = doc.Id,
        type = DocumentTypes.customerDeliveryNote,
        updatedbyid = user.Id,
        sales_site = new SiteDto { id = salesSite.Id },
        docnumber = doc.DocNumber,
        counterpart = new CounterPartDto
        {
          id = customer.Id,
          name = customer.Name,
          transporterid = 3 // Internal vehicle ID, not in Transporters
        },
        merchandises = new[]
        {
          new MerchandiseDto
          {
            id = merchandise.Id,
            article = new ArticleDto { id = article.Id, reference = article.Reference },
            cost_ht = 100,
            unit_price_ht = 100,
            quantity = 1,
            line_type = LineType.Merchandise
          }
        }
      };

      // Act
      var result = await controller.Update(doc.Id, updateDto);

      if (result is ObjectResult obj && (obj.StatusCode == null || obj.StatusCode != 200))
      {
        throw new Exception($"Update failed with status {obj.StatusCode}: {obj.Value}");
      }

      // Assert
      Assert.IsType<OkObjectResult>(result);

      var updatedCustomer = await _context.CounterParts.FindAsync(customer.Id);
      Assert.NotNull(updatedCustomer);
      Assert.Equal(1, updatedCustomer.TransporterId);
    }

    [Fact]
    public async Task AddDocument_TransportFeeMerchandise_WithInvalidTransporter_SetsTransporterIdToNull()
    {
      // Arrange
      var (user, customer, salesSite, article, merchandise) = await SeedBasicDataAsync();

      var controller = CreateDocumentController(user.Id);

      var docDto = new DocumentDto
      {
        type = DocumentTypes.customerDeliveryNote,
        updatedbyid = user.Id,
        sales_site = new SiteDto { id = salesSite.Id },
        docnumber = "BL-TEST-004",
        counterpart = new CounterPartDto
        {
          id = customer.Id,
          name = customer.Name
        },
        merchandises = new[]
        {
          new MerchandiseDto
          {
            id = merchandise.Id,
            article = new ArticleDto { id = article.Id, reference = article.Reference },
            cost_ht = 100,
            unit_price_ht = 100,
            quantity = 1,
            line_type = LineType.Merchandise
          },
          new MerchandiseDto
          {
            line_type = LineType.TransportFee,
            description = "Frais de transport",
            unit_price_ht = 50,
            cost_ht = 50,
            quantity = 1,
            transporter_id = 9999 // Nonexistent transporter ID (e.g. vehicle ID)
          }
        }
      };

      // Act
      var result = await controller.Add(docDto);

      if (result is ObjectResult obj && (obj.StatusCode == null || obj.StatusCode != 200))
      {
        throw new Exception($"Add failed with status {obj.StatusCode}: {obj.Value}");
      }

      // Assert
      Assert.IsType<OkObjectResult>(result);

      // Verify created DocumentMerchandise has null TransporterId
      var transportFee = await _context.DocumentMerchandises
          .FirstOrDefaultAsync(dm => dm.Type == LineType.TransportFee);
      Assert.NotNull(transportFee);
      Assert.Null(transportFee.TransporterId);
    }

    [Fact]
    public async Task DeliveryTracking_WithInternalVehicleAndNullTransporter_SuccessfullyCreatesRecord()
    {
      // Arrange
      var (user, customer, salesSite, _, _) = await SeedBasicDataAsync();

      var vehicle = new Vehicle
      {
        Id = 3,
        Brand = "ISUZU Dmax",
        SerialNumber = "9685 TU 145",
        IsOwned = true,
        FuelCardConductor = "Ali Ben Salah"
      };
      _context.Vehicles.Add(vehicle);

      var doc = new Document
      {
        DocNumber = "BL-TEST-060",
        Type = DocumentTypes.customerDeliveryNote,
        CounterPartId = customer.Id,
        SalesSiteId = salesSite.Id,
        SalesSite = salesSite,
        UpdatedById = user.Id,
        CreationDate = DateTime.UtcNow
      };
      _context.Documents.Add(doc);
      await _context.SaveChangesAsync();

      var repo = new DeliveryTrackingRepository(_context);

      var createDto = new CreateDeliveryTrackingDto
      {
        DocumentId = doc.Id,
        VehicleId = vehicle.Id,
        CustomerId = customer.Id,
        CustomerName = customer.Name,
        DeliveryAddress = "Sousse, Tunisie",
        TransporterId = null, // Null for internal fleet delivery
        DriverName = "Ali Ben Salah",
        DepartureDate = DateTime.UtcNow
      };

      // Act
      var tracking = await repo.CreateAsync(createDto, user.Id);

      // Assert
      Assert.NotNull(tracking);
      Assert.Equal(doc.Id, tracking.DocumentId);
      Assert.Equal(vehicle.Id, tracking.VehicleId);
      Assert.Null(tracking.TransporterId);
      Assert.Equal(DeliveryTrackingStatus.InTransit, tracking.Status);
      Assert.Equal("Ali Ben Salah", tracking.DriverName);
    }
  }
}

