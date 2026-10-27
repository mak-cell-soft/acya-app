using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using ms.admin.api.acya.Controllers;
using ms.admin.api.acya.core.DTOs;
using ms.admin.api.acya.core.Entities;
using ms.admin.api.acya.core.Interfaces;
using ms.admin.api.acya.infrastructure;
using ms.admin.api.acya.infrastructure.Services;
using ms.admin.api.acya.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace ms.admin.api.acya.tests
{
    public class SupportTicketsAdminTests
    {
        private MasterDbContext CreateInMemoryDbContext()
        {
            var options = new DbContextOptionsBuilder<MasterDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            return new MasterDbContext(options);
        }

        #region Authorization & Controller Endpoint Attributes

        [Fact]
        public void Controller_HasExpectedRouteAndAuthorizeAttribute()
        {
            var type = typeof(SupportTicketsController);

            // 1. ApiController attribute
            var apiAttr = type.GetCustomAttribute<ApiControllerAttribute>();
            Assert.NotNull(apiAttr);

            // 2. Route attribute
            var routeAttr = type.GetCustomAttribute<RouteAttribute>();
            Assert.NotNull(routeAttr);
            Assert.Equal("api/admin/support-tickets", routeAttr.Template);

            // 3. SuperAdmin Authorization attribute
            var authAttr = type.GetCustomAttribute<AuthorizeAttribute>();
            Assert.NotNull(authAttr);
            Assert.Equal("SUPER_ADMIN", authAttr.Roles);
        }

        [Fact]
        public void Controller_Endpoints_AreReadOnlyAndMappedProperly()
        {
            var type = typeof(SupportTicketsController);

            // List endpoint
            var listMethod = type.GetMethod("GetTickets");
            Assert.NotNull(listMethod);
            var listHttpAttr = listMethod.GetCustomAttribute<HttpGetAttribute>();
            Assert.NotNull(listHttpAttr);
            Assert.Null(listHttpAttr.Template); // Root route

            // Detail endpoint
            var detailMethod = type.GetMethod("GetTicketDetail");
            Assert.NotNull(detailMethod);
            var detailHttpAttr = detailMethod.GetCustomAttribute<HttpGetAttribute>();
            Assert.NotNull(detailHttpAttr);
            Assert.Equal("{tenantSlug}/{ticketId:int}", detailHttpAttr.Template);
        }

        #endregion

        #region Controller Logic & Response Mapping Tests

        [Fact]
        public async Task GetTickets_ReturnsOkResult_WithPagedData()
        {
            var mockService = new Mock<ISupportTicketAdminService>();
            var expectedResponse = new SupportTicketPagedResultDto
            {
                TotalCount = 2,
                Page = 1,
                PageSize = 20,
                TotalPages = 1,
                Items = new List<SupportTicketListItemDto>
                {
                    new()
                    {
                        Id = 1,
                        TicketReference = "EL-2026-00001",
                        TenantSlug = "socobois",
                        TenantName = "Socobois SARL",
                        Subject = "Issue with invoice",
                        Priority = "Élevée",
                        Category = "Comptabilité",
                        EmailStatus = 1,
                        EmailStatusText = "Envoyé",
                        HasAttachment = true,
                        AttachmentFileName = "invoice.pdf",
                        CreatedAt = DateTime.UtcNow
                    },
                    new()
                    {
                        Id = 2,
                        TicketReference = "EL-2026-00002",
                        TenantSlug = "socofeb",
                        TenantName = "Socofeb SARL",
                        Subject = "Display glitch",
                        Priority = "Normale",
                        Category = "Technique",
                        EmailStatus = 0,
                        EmailStatusText = "En attente",
                        HasAttachment = false,
                        CreatedAt = DateTime.UtcNow
                    }
                }
            };

            mockService
                .Setup(s => s.GetTicketsAsync(It.IsAny<SupportTicketFilterDto>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(expectedResponse);

            var controller = new SupportTicketsController(mockService.Object, NullLogger<SupportTicketsController>.Instance);

            var result = await controller.GetTickets(
                page: 1,
                pageSize: 20,
                tenantSlug: "socobois",
                priority: "Élevée",
                category: "Comptabilité",
                search: "invoice");

            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<SupportTicketPagedResultDto>(okResult.Value);
            Assert.Equal(2, response.TotalCount);
            Assert.Equal(2, response.Items.Count);
            Assert.Equal("EL-2026-00001", response.Items[0].TicketReference);
            Assert.Equal("Socobois SARL", response.Items[0].TenantName);
        }

        [Fact]
        public async Task GetTicketDetail_ValidTicket_ReturnsOkWithDetail()
        {
            var mockService = new Mock<ISupportTicketAdminService>();
            var detailDto = new SupportTicketDetailDto
            {
                Id = 42,
                TicketReference = "EL-2026-00042",
                TenantSlug = "socobois",
                TenantName = "Socobois SARL",
                EnterpriseName = "Socobois SARL",
                UserId = 10,
                UserFullName = "Ahmed Admin",
                UserEmail = "ahmed@socobois.tn",
                Category = "Technique",
                Subcategory = "Impression",
                Priority = "Critique",
                Subject = "Printer offline",
                Description = "Thermal printer won't connect.",
                CurrentRoute = "/production/cuts",
                AppVersion = "v2.0",
                ContextData = "{\"os\": \"Linux\"}",
                HasAttachment = true,
                AttachmentFileName = "log.txt",
                AttachmentContentType = "text/plain",
                AttachmentSizeBytes = 1024,
                EmailStatus = 1,
                EmailStatusText = "Envoyé",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            mockService
                .Setup(s => s.GetTicketDetailAsync("socobois", 42, It.IsAny<CancellationToken>()))
                .ReturnsAsync(detailDto);

            var controller = new SupportTicketsController(mockService.Object, NullLogger<SupportTicketsController>.Instance);

            var result = await controller.GetTicketDetail("socobois", 42);

            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<SupportTicketDetailDto>(okResult.Value);
            Assert.Equal(42, response.Id);
            Assert.Equal("EL-2026-00042", response.TicketReference);
            Assert.Equal("Ahmed Admin", response.UserFullName);
            Assert.Equal("socobois", response.TenantSlug);
            Assert.True(response.HasAttachment);
        }

        [Theory]
        [InlineData("", 1)]
        [InlineData("   ", 1)]
        [InlineData("socobois", 0)]
        [InlineData("socobois", -5)]
        public async Task GetTicketDetail_InvalidParameters_ReturnsBadRequest(string tenantSlug, int ticketId)
        {
            var mockService = new Mock<ISupportTicketAdminService>();
            var controller = new SupportTicketsController(mockService.Object, NullLogger<SupportTicketsController>.Instance);

            var result = await controller.GetTicketDetail(tenantSlug, ticketId);

            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            Assert.NotNull(badRequest.Value);
        }

        [Fact]
        public async Task GetTicketDetail_NotFound_ReturnsNotFoundResult()
        {
            var mockService = new Mock<ISupportTicketAdminService>();
            mockService
                .Setup(s => s.GetTicketDetailAsync("socobois", 999, It.IsAny<CancellationToken>()))
                .ReturnsAsync((SupportTicketDetailDto?)null);

            var controller = new SupportTicketsController(mockService.Object, NullLogger<SupportTicketsController>.Instance);

            var result = await controller.GetTicketDetail("socobois", 999);

            var notFound = Assert.IsType<NotFoundObjectResult>(result);
            Assert.NotNull(notFound.Value);
        }

        [Fact]
        public async Task GetTicketDetail_InvalidOperationException_ReturnsBadRequest()
        {
            var mockService = new Mock<ISupportTicketAdminService>();
            mockService
                .Setup(s => s.GetTicketDetailAsync("malicious_tenant", 1, It.IsAny<CancellationToken>()))
                .ThrowsAsync(new InvalidOperationException("Invalid tenant schema configuration."));

            var controller = new SupportTicketsController(mockService.Object, NullLogger<SupportTicketsController>.Instance);

            var result = await controller.GetTicketDetail("malicious_tenant", 1);

            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            Assert.NotNull(badRequest.Value);
        }

        #endregion

        #region Security, Sanitization & Privacy Invariants

        [Theory]
        [InlineData("tenant_socobois", true)]
        [InlineData("tenant_123", true)]
        [InlineData("public", true)]
        [InlineData("tenant_socobois; DROP TABLE tbl_support_tickets;--", false)]
        [InlineData("tenant_socobois' OR '1'='1", false)]
        [InlineData("tenant\"socobois", false)]
        [InlineData("../../../etc/passwd", false)]
        [InlineData("tenant socobois", false)]
        [InlineData("", false)]
        [InlineData(null, false)]
        public void SchemaSanitizer_EnforcesStrictAlphanumericIdentifiers(string? schemaName, bool shouldBeValid)
        {
            var isValid = SchemaSanitizer.IsValidIdentifier(schemaName);
            Assert.Equal(shouldBeValid, isValid);

            if (shouldBeValid)
            {
                var quoted = SchemaSanitizer.QuoteIdentifier(schemaName!);
                Assert.Equal($"\"{schemaName}\"", quoted);
            }
            else if (schemaName != null)
            {
                Assert.Throws<ArgumentException>(() => SchemaSanitizer.QuoteIdentifier(schemaName));
            }
        }

        [Fact]
        public void Security_DTOs_NeverExposeInternalStoragePathsOrSecrets()
        {
            // Verify SupportTicketListItemDto
            var listProps = typeof(SupportTicketListItemDto).GetProperties().Select(p => p.Name).ToList();
            Assert.DoesNotContain("AttachmentStoragePath", listProps);
            Assert.DoesNotContain("StoragePath", listProps);
            Assert.DoesNotContain("IdempotencyKey", listProps);
            Assert.DoesNotContain("Password", listProps);
            Assert.DoesNotContain("Secret", listProps);

            // Verify SupportTicketDetailDto
            var detailProps = typeof(SupportTicketDetailDto).GetProperties().Select(p => p.Name).ToList();
            Assert.DoesNotContain("AttachmentStoragePath", detailProps);
            Assert.DoesNotContain("StoragePath", detailProps);
            Assert.DoesNotContain("IdempotencyKey", detailProps);
            Assert.DoesNotContain("Password", detailProps);
            Assert.DoesNotContain("Secret", detailProps);

            // Verify serialized JSON does not contain storage paths
            var detail = new SupportTicketDetailDto
            {
                Id = 1,
                TicketReference = "EL-2026-00001",
                AttachmentFileName = "screenshot.png",
                AttachmentContentType = "image/png",
                AttachmentSizeBytes = 50000
            };

            var json = JsonSerializer.Serialize(detail);
            Assert.DoesNotContain("storage/private", json, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("AttachmentStoragePath", json, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public async Task Service_WhenNoEnterprisesMatch_ReturnsEmptyResultWithoutDatabaseError()
        {
            using var context = CreateInMemoryDbContext();
            var config = new ConfigurationBuilder().Build();
            var service = new SupportTicketAdminService(
                context,
                config,
                NullLogger<SupportTicketAdminService>.Instance);

            var filter = new SupportTicketFilterDto
            {
                TenantSlug = "non_existent_slug"
            };

            var result = await service.GetTicketsAsync(filter);

            Assert.Equal(0, result.TotalCount);
            Assert.Empty(result.Items);
            Assert.Equal(0, result.TotalPages);
        }

        [Fact]
        public async Task Service_WhenEnterpriseHasMaliciousSchema_DoesNotQueryAndReturnsEmpty()
        {
            using var context = CreateInMemoryDbContext();
            context.Enterprises.Add(new MasterEnterprise
            {
                Id = 99,
                Slug = "malicious",
                Name = "Malicious Corp",
                SchemaName = "tenant'; DROP TABLE--",
                IsActive = true
            });
            await context.SaveChangesAsync();

            var config = new ConfigurationBuilder().Build();
            var service = new SupportTicketAdminService(
                context,
                config,
                NullLogger<SupportTicketAdminService>.Instance);

            var filter = new SupportTicketFilterDto
            {
                TenantSlug = "malicious"
            };

            var result = await service.GetTicketsAsync(filter);

            Assert.Equal(0, result.TotalCount);
            Assert.Empty(result.Items);
        }

        [Fact]
        public async Task Service_GetTicketDetail_WhenEnterpriseHasInvalidSchema_ThrowsInvalidOperationException()
        {
            using var context = CreateInMemoryDbContext();
            context.Enterprises.Add(new MasterEnterprise
            {
                Id = 99,
                Slug = "invalidschema",
                Name = "Invalid Schema Corp",
                SchemaName = "invalid-schema!name",
                IsActive = true
            });
            await context.SaveChangesAsync();

            var config = new ConfigurationBuilder().Build();
            var service = new SupportTicketAdminService(
                context,
                config,
                NullLogger<SupportTicketAdminService>.Instance);

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                service.GetTicketDetailAsync("invalidschema", 1));
        }

        [Fact]
        public async Task Service_GetTicketDetail_WhenTenantNotFound_ReturnsNull()
        {
            using var context = CreateInMemoryDbContext();
            var config = new ConfigurationBuilder().Build();
            var service = new SupportTicketAdminService(
                context,
                config,
                NullLogger<SupportTicketAdminService>.Instance);

            var detail = await service.GetTicketDetailAsync("does_not_exist", 1);
            Assert.Null(detail);
        }

        #endregion

        #region Status Management Tests

        [Theory]
        [InlineData("New", true)]
        [InlineData("InProgress", true)]
        [InlineData("WaitingForCustomer", true)]
        [InlineData("Resolved", true)]
        [InlineData("Closed", true)]
        [InlineData("new", true)]
        [InlineData("inprogress", true)]
        [InlineData("waitingforcustomer", true)]
        [InlineData("resolved", true)]
        [InlineData("closed", true)]
        [InlineData("Open", false)]
        [InlineData("Pending", false)]
        [InlineData("In_Progress", false)]
        [InlineData("Unknown", false)]
        [InlineData("", false)]
        [InlineData(null, false)]
        public void StatusModel_ValidatesSupportedStatuses(string? status, bool expectedValid)
        {
            var isValid = SupportTicketStatuses.IsValid(status);
            Assert.Equal(expectedValid, isValid);

            if (expectedValid)
            {
                var normalized = SupportTicketStatuses.Normalize(status!);
                Assert.Contains(normalized, SupportTicketStatuses.All);
            }
        }

        [Fact]
        public void Controller_HasUpdateTicketStatusPatchEndpoint()
        {
            var type = typeof(SupportTicketsController);
            var patchMethod = type.GetMethod("UpdateTicketStatus");
            Assert.NotNull(patchMethod);

            var patchAttr = patchMethod.GetCustomAttribute<HttpPatchAttribute>();
            Assert.NotNull(patchAttr);
            Assert.Equal("{tenantSlug}/{ticketId:int}/status", patchAttr.Template);

            // Inherits controller-level [Authorize(Roles = "SUPER_ADMIN")]
            var authAttr = type.GetCustomAttribute<AuthorizeAttribute>();
            Assert.NotNull(authAttr);
            Assert.Equal("SUPER_ADMIN", authAttr.Roles);
        }

        [Fact]
        public async Task UpdateTicketStatus_WithValidStatus_ReturnsOkResult()
        {
            var mockService = new Mock<ISupportTicketAdminService>();
            var expectedResponse = new UpdateTicketStatusResponseDto
            {
                TicketId = 15,
                TicketReference = "EL-2026-00015",
                TenantSlug = "socobois",
                Status = SupportTicketStatuses.InProgress,
                UpdatedAt = DateTime.UtcNow
            };

            mockService
                .Setup(s => s.UpdateTicketStatusAsync("socobois", 15, "InProgress", It.IsAny<CancellationToken>()))
                .ReturnsAsync(expectedResponse);

            var controller = new SupportTicketsController(mockService.Object, NullLogger<SupportTicketsController>.Instance);
            var result = await controller.UpdateTicketStatus("socobois", 15, new UpdateTicketStatusRequestDto { Status = "InProgress" });

            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<UpdateTicketStatusResponseDto>(okResult.Value);
            Assert.Equal(15, response.TicketId);
            Assert.Equal("EL-2026-00015", response.TicketReference);
            Assert.Equal("InProgress", response.Status);
        }

        [Theory]
        [InlineData("InvalidStatus")]
        [InlineData("Pending")]
        [InlineData("Rejected")]
        [InlineData("Deleted")]
        public async Task UpdateTicketStatus_WithInvalidStatus_ReturnsBadRequest(string invalidStatus)
        {
            var mockService = new Mock<ISupportTicketAdminService>();
            var controller = new SupportTicketsController(mockService.Object, NullLogger<SupportTicketsController>.Instance);

            var result = await controller.UpdateTicketStatus("socobois", 1, new UpdateTicketStatusRequestDto { Status = invalidStatus });

            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            Assert.NotNull(badRequest.Value);
        }

        [Fact]
        public async Task UpdateTicketStatus_WithEmptyStatus_ReturnsBadRequest()
        {
            var mockService = new Mock<ISupportTicketAdminService>();
            var controller = new SupportTicketsController(mockService.Object, NullLogger<SupportTicketsController>.Instance);

            var result = await controller.UpdateTicketStatus("socobois", 1, new UpdateTicketStatusRequestDto { Status = "  " });

            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            Assert.NotNull(badRequest.Value);
        }

        [Theory]
        [InlineData("", 1)]
        [InlineData("  ", 1)]
        [InlineData("socobois", 0)]
        [InlineData("socobois", -1)]
        public async Task UpdateTicketStatus_WithInvalidParameters_ReturnsBadRequest(string tenantSlug, int ticketId)
        {
            var mockService = new Mock<ISupportTicketAdminService>();
            var controller = new SupportTicketsController(mockService.Object, NullLogger<SupportTicketsController>.Instance);

            var result = await controller.UpdateTicketStatus(tenantSlug, ticketId, new UpdateTicketStatusRequestDto { Status = "InProgress" });

            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            Assert.NotNull(badRequest.Value);
        }

        [Fact]
        public async Task UpdateTicketStatus_TicketNotFound_ReturnsNotFound()
        {
            var mockService = new Mock<ISupportTicketAdminService>();
            mockService
                .Setup(s => s.UpdateTicketStatusAsync("socobois", 999, "Resolved", It.IsAny<CancellationToken>()))
                .ReturnsAsync((UpdateTicketStatusResponseDto?)null);

            var controller = new SupportTicketsController(mockService.Object, NullLogger<SupportTicketsController>.Instance);
            var result = await controller.UpdateTicketStatus("socobois", 999, new UpdateTicketStatusRequestDto { Status = "Resolved" });

            var notFound = Assert.IsType<NotFoundObjectResult>(result);
            Assert.NotNull(notFound.Value);
        }

        [Fact]
        public async Task Service_UpdateTicketStatus_ThrowsArgumentException_OnInvalidStatus()
        {
            using var context = CreateInMemoryDbContext();
            var config = new ConfigurationBuilder().Build();
            var service = new SupportTicketAdminService(context, config, NullLogger<SupportTicketAdminService>.Instance);

            await Assert.ThrowsAsync<ArgumentException>(() =>
                service.UpdateTicketStatusAsync("socobois", 1, "NonExistentStatus"));
        }

        [Fact]
        public async Task Service_UpdateTicketStatus_ReturnsNull_WhenTenantNotFound()
        {
            using var context = CreateInMemoryDbContext();
            var config = new ConfigurationBuilder().Build();
            var service = new SupportTicketAdminService(context, config, NullLogger<SupportTicketAdminService>.Instance);

            var result = await service.UpdateTicketStatusAsync("unknown_tenant", 1, "InProgress");
            Assert.Null(result);
        }

        [Fact]
        public async Task Service_UpdateTicketStatus_ThrowsInvalidOperationException_OnInvalidSchemaIdentifier()
        {
            using var context = CreateInMemoryDbContext();
            context.Enterprises.Add(new MasterEnterprise
            {
                Id = 88,
                Slug = "bad-schema-tenant",
                Name = "Bad Schema Corp",
                SchemaName = "malicious_schema;--",
                IsActive = true
            });
            await context.SaveChangesAsync();

            var config = new ConfigurationBuilder().Build();
            var service = new SupportTicketAdminService(context, config, NullLogger<SupportTicketAdminService>.Instance);

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                service.UpdateTicketStatusAsync("bad-schema-tenant", 1, "InProgress"));
        }

        #endregion
    }
}
