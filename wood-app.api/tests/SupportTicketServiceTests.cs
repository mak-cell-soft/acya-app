using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Claims;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using ms.webapp.api.acya.api.Controllers;
using ms.webapp.api.acya.api.Models;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.core.Interfaces;
using ms.webapp.api.acya.infrastructure;
using ms.webapp.api.acya.Services;
using Xunit;

namespace ms.webapp.api.acya.tests
{
    public class SupportTicketServiceTests
    {
        private WoodAppContext CreateInMemoryContext(string dbName)
        {
            var options = new DbContextOptionsBuilder<WoodAppContext>()
                .UseInMemoryDatabase(databaseName: dbName)
                .Options;

            return new WoodAppContext(options);
        }

        private Mock<IConfiguration> CreateMockConfiguration()
        {
            var mock = new Mock<IConfiguration>();
            mock.Setup(c => c["EmailSettings:SupportEmail"]).Returns("support@acya.site");
            mock.Setup(c => c["SupportStorage:BasePath"]).Returns("test_storage/support");
            return mock;
        }

        [Fact]
        public async Task CreateTicket_ValidInput_PersistsTicketAndDispatchesEmail()
        {
            // Arrange
            using var context = CreateInMemoryContext(Guid.NewGuid().ToString());
            var emailMock = new Mock<IEmailService>();
            var configMock = CreateMockConfiguration();
            var loggerMock = new Mock<ILogger<SupportTicketService>>();
            var smtpOptions = Options.Create(new SmtpSettings { SenderEmail = "ticket@acya.site" });

            var service = new SupportTicketService(context, emailMock.Object, configMock.Object, smtpOptions, loggerMock.Object);

            var dto = new CreateSupportTicketDto
            {
                Category = "Gestion du stock",
                Subcategory = "Quantité de stock incorrecte",
                Priority = "Élevée",
                Subject = "Écart de stock sur article Chêne",
                Description = "Stock théorique 15m3 mais physique 12m3",
                CurrentRoute = "/stock",
                AppVersion = "v2.0"
            };

            // Act
            var result = await service.CreateTicketAsync(dto, 42, "Jean Dupont", "jean@socobois.tn", "SOCOBOIS SARL", "socobois");

            // Assert
            Assert.NotNull(result);
            Assert.StartsWith("EL-", result.TicketReference);
            Assert.Equal("Gestion du stock", result.Category);
            Assert.Equal("Élevée", result.Priority);
            Assert.True(result.EmailDispatched);

            var saved = await context.SupportTickets.FirstOrDefaultAsync(t => t.TicketReference == result.TicketReference);
            Assert.NotNull(saved);
            Assert.Equal(42, saved.UserId);
            Assert.Equal("socobois", saved.TenantSlug);
            Assert.Equal(TicketEmailStatus.Sent, saved.EmailStatus);

            emailMock.Verify(e => e.SendEmailAsync(
                "support@acya.site",
                It.Is<string>(s => s.Contains("[ÉLANCÉ][SOCOBOIS][GESTION DU STOCK][ÉLEVÉE]") && s.Contains(result.TicketReference)),
                It.Is<string>(b => b.Contains("Jean Dupont") && b.Contains(result.TicketReference)),
                true), Times.Once);
        }

        [Fact]
        public async Task CreateTicket_MissingSubject_ThrowsArgumentException()
        {
            // Arrange
            using var context = CreateInMemoryContext(Guid.NewGuid().ToString());
            var emailMock = new Mock<IEmailService>();
            var configMock = CreateMockConfiguration();
            var loggerMock = new Mock<ILogger<SupportTicketService>>();
            var smtpOptions = Options.Create(new SmtpSettings());

            var service = new SupportTicketService(context, emailMock.Object, configMock.Object, smtpOptions, loggerMock.Object);

            var dto = new CreateSupportTicketDto
            {
                Category = "Application mobile",
                Subcategory = "Installation",
                Subject = "",
                Description = "Impossible d'installer l'apk"
            };

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentException>(() =>
                service.CreateTicketAsync(dto, 1, "User", "user@test.com", "Test Ent", "socobois"));
        }

        [Fact]
        public async Task CreateTicket_InvalidCategory_ThrowsArgumentException()
        {
            // Arrange
            using var context = CreateInMemoryContext(Guid.NewGuid().ToString());
            var emailMock = new Mock<IEmailService>();
            var configMock = CreateMockConfiguration();
            var loggerMock = new Mock<ILogger<SupportTicketService>>();
            var smtpOptions = Options.Create(new SmtpSettings());

            var service = new SupportTicketService(context, emailMock.Object, configMock.Object, smtpOptions, loggerMock.Object);

            var dto = new CreateSupportTicketDto
            {
                Category = "CatégorieInconnue",
                Subcategory = "Autre",
                Subject = "Problème",
                Description = "Description"
            };

            // Act & Assert
            var ex = await Assert.ThrowsAsync<ArgumentException>(() =>
                service.CreateTicketAsync(dto, 1, "User", "user@test.com", "Test Ent", "socobois"));
            Assert.Contains("Catégorie non reconnue", ex.Message);
        }

        [Fact]
        public async Task CreateTicket_InvalidPriority_ThrowsArgumentException()
        {
            // Arrange
            using var context = CreateInMemoryContext(Guid.NewGuid().ToString());
            var emailMock = new Mock<IEmailService>();
            var configMock = CreateMockConfiguration();
            var loggerMock = new Mock<ILogger<SupportTicketService>>();
            var smtpOptions = Options.Create(new SmtpSettings());

            var service = new SupportTicketService(context, emailMock.Object, configMock.Object, smtpOptions, loggerMock.Object);

            var dto = new CreateSupportTicketDto
            {
                Category = "Autre demande",
                Subcategory = "Autre",
                Priority = "UltraCritiqueInconnue",
                Subject = "Problème",
                Description = "Description"
            };

            // Act & Assert
            var ex = await Assert.ThrowsAsync<ArgumentException>(() =>
                service.CreateTicketAsync(dto, 1, "User", "user@test.com", "Test Ent", "socobois"));
            Assert.Contains("Priorité non reconnue", ex.Message);
        }

        [Fact]
        public async Task CreateTicket_EmailFailure_DoesNotDiscardPersistedTicket()
        {
            // Arrange
            using var context = CreateInMemoryContext(Guid.NewGuid().ToString());
            var emailMock = new Mock<IEmailService>();
            emailMock.Setup(e => e.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<bool>()))
                .ThrowsAsync(new InvalidOperationException("SMTP connection timed out"));

            var configMock = CreateMockConfiguration();
            var loggerMock = new Mock<ILogger<SupportTicketService>>();
            var smtpOptions = Options.Create(new SmtpSettings());

            var service = new SupportTicketService(context, emailMock.Object, configMock.Object, smtpOptions, loggerMock.Object);

            var dto = new CreateSupportTicketDto
            {
                Category = "Ressources humaines",
                Subcategory = "Problème de présence",
                Priority = "Normale",
                Subject = "Erreur de pointage",
                Description = "L'employé est marqué absent par erreur"
            };

            // Act
            var result = await service.CreateTicketAsync(dto, 10, "RH User", "rh@socobois.tn", "SOCOBOIS", "socobois");

            // Assert
            Assert.NotNull(result);
            Assert.False(result.EmailDispatched);
            Assert.Equal("Failed", result.EmailStatus);

            var persisted = await context.SupportTickets.FirstOrDefaultAsync(t => t.TicketReference == result.TicketReference);
            Assert.NotNull(persisted);
            Assert.Equal(TicketEmailStatus.Failed, persisted.EmailStatus);
            Assert.Contains("SMTP connection timed out", persisted.EmailError);
        }

        [Fact]
        public async Task CreateTicket_HtmlEmailEscaping_EscapesMaliciousInput()
        {
            // Arrange
            using var context = CreateInMemoryContext(Guid.NewGuid().ToString());
            string sentHtml = "";
            var emailMock = new Mock<IEmailService>();
            emailMock.Setup(e => e.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<bool>()))
                .Callback<string, string, string, bool>((to, sub, body, isHtml) => sentHtml = body)
                .Returns(Task.CompletedTask);

            var configMock = CreateMockConfiguration();
            var loggerMock = new Mock<ILogger<SupportTicketService>>();
            var smtpOptions = Options.Create(new SmtpSettings());

            var service = new SupportTicketService(context, emailMock.Object, configMock.Object, smtpOptions, loggerMock.Object);

            var dto = new CreateSupportTicketDto
            {
                Category = "Autre demande",
                Subcategory = "Problème technique",
                Subject = "<script>alert('xss')</script>",
                Description = "<b>Bold</b> & <img src=x onerror=alert(1)>"
            };

            // Act
            await service.CreateTicketAsync(dto, 1, "<script>evil()</script>", "test@mail.com", "Evil & Co", "socobois");

            // Assert
            Assert.DoesNotContain("<script>alert('xss')</script>", sentHtml);
            Assert.Contains("&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;", sentHtml);
            Assert.DoesNotContain("<img src=x onerror=alert(1)>", sentHtml);
            Assert.Contains("&lt;img src=x onerror=alert(1)&gt;", sentHtml);
        }

        [Fact]
        public async Task CreateTicket_IdempotencyKey_ReturnsSameTicketWithoutDuplicate()
        {
            // Arrange
            using var context = CreateInMemoryContext(Guid.NewGuid().ToString());
            var emailMock = new Mock<IEmailService>();
            var configMock = CreateMockConfiguration();
            var loggerMock = new Mock<ILogger<SupportTicketService>>();
            var smtpOptions = Options.Create(new SmtpSettings());

            var service = new SupportTicketService(context, emailMock.Object, configMock.Object, smtpOptions, loggerMock.Object);

            var dto = new CreateSupportTicketDto
            {
                Category = "Gestion des articles",
                Subcategory = "Prix incorrect",
                Subject = "Erreur prix article A10",
                Description = "Prix affiché 0 DT au lieu de 45 DT",
                IdempotencyKey = "idemp-key-12345"
            };

            // Act - First submission
            var res1 = await service.CreateTicketAsync(dto, 1, "User", "u@test.com", "Ent", "socobois");

            // Act - Second submission with same IdempotencyKey (e.g. retry on timeout)
            var res2 = await service.CreateTicketAsync(dto, 1, "User", "u@test.com", "Ent", "socobois");

            // Assert
            Assert.Equal(res1.TicketReference, res2.TicketReference);
            Assert.Equal(1, await context.SupportTickets.CountAsync());
            emailMock.Verify(e => e.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<bool>()), Times.Once);
        }

        [Fact]
        public async Task CreateTicket_AttachmentValidation_RejectsDisallowedExtension()
        {
            // Arrange
            using var context = CreateInMemoryContext(Guid.NewGuid().ToString());
            var emailMock = new Mock<IEmailService>();
            var configMock = CreateMockConfiguration();
            var loggerMock = new Mock<ILogger<SupportTicketService>>();
            var smtpOptions = Options.Create(new SmtpSettings());

            var service = new SupportTicketService(context, emailMock.Object, configMock.Object, smtpOptions, loggerMock.Object);

            var dto = new CreateSupportTicketDto
            {
                Category = "Autre demande",
                Subcategory = "Autre",
                Subject = "Test",
                Description = "Test",
                AttachmentBytes = new byte[] { 0x4D, 0x5A, 0x90 }, // Executable DOS header
                AttachmentFileName = "malicious.exe"
            };

            // Act & Assert
            var ex = await Assert.ThrowsAsync<ArgumentException>(() =>
                service.CreateTicketAsync(dto, 1, "User", "u@test.com", "Ent", "socobois"));
            Assert.Contains("Format de fichier non autorisé", ex.Message);
        }

        [Fact]
        public async Task CreateTicket_AttachmentValidation_RejectsMagicBytesMismatch()
        {
            // Arrange
            using var context = CreateInMemoryContext(Guid.NewGuid().ToString());
            var emailMock = new Mock<IEmailService>();
            var configMock = CreateMockConfiguration();
            var loggerMock = new Mock<ILogger<SupportTicketService>>();
            var smtpOptions = Options.Create(new SmtpSettings());

            var service = new SupportTicketService(context, emailMock.Object, configMock.Object, smtpOptions, loggerMock.Object);

            var dto = new CreateSupportTicketDto
            {
                Category = "Autre demande",
                Subcategory = "Autre",
                Subject = "Test",
                Description = "Test",
                AttachmentBytes = new byte[] { 0x11, 0x22, 0x33, 0x44 }, // Fake bytes, not %PDF
                AttachmentFileName = "fake.pdf"
            };

            // Act & Assert
            var ex = await Assert.ThrowsAsync<ArgumentException>(() =>
                service.CreateTicketAsync(dto, 1, "User", "u@test.com", "Ent", "socobois"));
            Assert.Contains("signature du fichier ne correspond pas", ex.Message);
        }

        [Fact]
        public async Task SupportController_SubmitTicket_EnforcesAuthoritativeIdentityAndTenant()
        {
            // Arrange
            var supportServiceMock = new Mock<ISupportTicketService>();
            var tenantContext = new TenantContext { Slug = "socobois", IsEnabled = true };
            var loggerMock = new Mock<ILogger<SupportController>>();

            supportServiceMock.Setup(s => s.CreateTicketAsync(
                It.IsAny<CreateSupportTicketDto>(),
                55,
                "Authorized User",
                "auth@socobois.tn",
                "SOCOBOIS SARL",
                "socobois",
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SupportTicketResponseDto
            {
                TicketReference = "EL-2026-00042",
                Category = "Gestion du stock",
                Subject = "Test Controller",
                EmailDispatched = true
            });

            var controller = new SupportController(supportServiceMock.Object, tenantContext, loggerMock.Object);

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, "55"),
                new Claim(ClaimTypes.Name, "Authorized User"),
                new Claim(ClaimTypes.Email, "auth@socobois.tn"),
                new Claim("EnterpriseName", "SOCOBOIS SARL"),
                new Claim("TenantSlug", "socobois")
            };
            var identity = new ClaimsIdentity(claims, "TestAuth");
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
            };

            var form = new SubmitSupportTicketFormRequest
            {
                Category = "Gestion du stock",
                Subcategory = "Inventaire",
                Subject = "Test Controller",
                Description = "Description text here"
            };

            // Act
            var result = await controller.SubmitTicket(form, CancellationToken.None);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var response = Assert.IsType<SupportTicketResponseDto>(okResult.Value);
            Assert.Equal("EL-2026-00042", response.TicketReference);
        }

        [Fact]
        public void SupportController_AccessModel_HasNoGetEndpointsForTicketTracking()
        {
            // Verify that SupportController does NOT expose any GET endpoints (e.g. mine, {reference})
            // Enforces mandatory business rule: Clients must NEVER have access to a ticket-tracking interface.
            var controllerType = typeof(SupportController);
            var methods = controllerType.GetMethods(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.DeclaredOnly);

            var getMethods = new List<System.Reflection.MethodInfo>();
            foreach (var m in methods)
            {
                var httpGetAttr = m.GetCustomAttributes(typeof(HttpGetAttribute), false);
                if (httpGetAttr.Length > 0)
                {
                    getMethods.Add(m);
                }
            }

            // Assert: There are ZERO HTTP GET methods on the client SupportController
            Assert.Empty(getMethods);

            // Assert: Only SubmitTicket (POST) exists as an action
            var postMethods = new List<System.Reflection.MethodInfo>();
            foreach (var m in methods)
            {
                var httpPostAttr = m.GetCustomAttributes(typeof(HttpPostAttribute), false);
                if (httpPostAttr.Length > 0)
                {
                    postMethods.Add(m);
                }
            }

            Assert.Single(postMethods);
            Assert.Equal(nameof(SupportController.SubmitTicket), postMethods[0].Name);
        }

        [Fact]
        public async Task SupportController_SubmitTicket_UnauthenticatedUser_ReturnsUnauthorized()
        {
            // Arrange
            var supportServiceMock = new Mock<ISupportTicketService>();
            var tenantContext = new TenantContext { Slug = "socobois" };
            var loggerMock = new Mock<ILogger<SupportController>>();
            var controller = new SupportController(supportServiceMock.Object, tenantContext, loggerMock.Object);

            // No NameIdentifier claim in principal
            var identity = new ClaimsIdentity(); // Unauthenticated
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
            };

            var form = new SubmitSupportTicketFormRequest
            {
                Category = "Gestion du stock",
                Subcategory = "Inventaire",
                Subject = "Test Controller",
                Description = "Description text here"
            };

            // Act
            var result = await controller.SubmitTicket(form, CancellationToken.None);

            // Assert
            Assert.IsType<UnauthorizedObjectResult>(result);
        }
    }
}
