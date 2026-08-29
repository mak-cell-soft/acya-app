using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.Controllers.Integrations;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.Product;
using ms.webapp.api.acya.core.Integrations.Qwerty.DTOs;
using ms.webapp.api.acya.core.Integrations.Qwerty.Interfaces;
using ms.webapp.api.acya.infrastructure;
using ms.webapp.api.acya.Services.Integrations.Qwerty;
using Xunit;

namespace ms.webapp.api.acya.tests
{
    public class QwertyIntegrationTests
    {
        private readonly QwertyDataMapper _mapper;

        public QwertyIntegrationTests()
        {
            _mapper = new QwertyDataMapper();
        }

        [Fact]
        public void MapSalesDocuments_ShouldFormatSalesInvoiceCorrectly()
        {
            // Arrange
            var customer = new CounterPart
            {
                Id = 42,
                Name = "SOCIETE XYZ",
                TaxRegistrationNumber = "1234567A",
                Address = "Rue de la Liberté, Tunis",
                PhoneNumberOne = "71000000",
                Email = "contact@xyz.tn",
                Type = CounterPartType.Customer
            };

            var tva19 = new AppVariable { Id = 1, Nature = "Tva", Name = "19%", Value = 19.0 };
            var article1 = new Article { Id = 1, Reference = "ART01", TVAs = tva19 };
            var merch1 = new Merchandise { Id = 1, Articles = article1 };

            var lines = new List<DocumentMerchandise>
            {
                new DocumentMerchandise
                {
                    Id = 1,
                    CostNetHT = 100.0,
                    TvaValue = 19.0,
                    CostTTC = 119.0,
                    Merchandise = merch1
                }
            };

            var doc = new Document
            {
                Id = 101,
                Type = DocumentTypes.customerInvoice,
                DocNumber = "FAC-2026-0001",
                Description = "Vente marchandises",
                CreationDate = new DateTime(2026, 8, 20),
                TotalCostHTNetDoc = 100.0,
                TotalCostTvaDoc = 19.0,
                TotalCostNetTTCDoc = 120.0,
                Taxes = new AppVariable { Id = 10, Nature = "Taxe", Name = "Timbre", Value = 1.0 },
                CounterPart = customer,
                DocumentMerchandises = lines
            };

            // Act
            var results = _mapper.MapSalesDocuments(new[] { doc });

            // Assert
            Assert.Single(results);
            var op = results[0];

            Assert.Equal("2026-08-20", op.DateOperation);
            Assert.Equal("FAC-2026-0001", op.Facture);
            Assert.Equal("1234567A", op.Client);
            Assert.NotNull(op.ClientCreation);
            Assert.Equal("SOCIETE XYZ", op.ClientCreation!.Nom);
            Assert.Equal("1234567A", op.ClientCreation.MatriculeFiscal);
            Assert.Equal("411042", op.ClientCreation.CompteAuxiliaire);

            Assert.Equal(100.000m, op.Montants["ht1"]);
            Assert.Equal(19.000m, op.Montants["tva1"]);
            Assert.Equal(1.000m, op.Montants["timbre"]);
            Assert.Equal(120.000m, op.Montants["ttc"]);
        }

        [Fact]
        public void MapPurchaseDocuments_ShouldFormatSupplierInvoiceCorrectly()
        {
            // Arrange
            var supplier = new CounterPart
            {
                Id = 12,
                Name = "FOURNISSEUR ABC",
                TaxRegistrationNumber = "9876543B",
                Address = "Zone industrielle, Sfax",
                PhoneNumberOne = "74000000",
                Email = "contact@abc.tn",
                Type = CounterPartType.Supplier
            };

            var doc = new Document
            {
                Id = 202,
                Type = DocumentTypes.supplierInvoice,
                DocNumber = "INT-2026-05",
                SupplierReference = "FF-2026-88",
                Description = "Achat matières premières",
                CreationDate = new DateTime(2026, 8, 15),
                TotalCostHTNetDoc = 1000.0,
                TotalCostTvaDoc = 190.0,
                TotalCostNetTTCDoc = 1190.0,
                CounterPart = supplier
            };

            // Act
            var results = _mapper.MapPurchaseDocuments(new[] { doc });

            // Assert
            Assert.Single(results);
            var op = results[0];

            Assert.Equal("2026-08-15", op.DateOperation);
            Assert.Equal("FF-2026-88", op.Facture);
            Assert.Equal("9876543B", op.Fournisseur);
            Assert.NotNull(op.FournisseurCreation);
            Assert.Equal("FOURNISSEUR ABC", op.FournisseurCreation!.Nom);
            Assert.Equal("401012", op.FournisseurCreation.CompteAuxiliaire);

            Assert.Equal(1000.000m, op.Montants["ht1"]);
            Assert.Equal(190.000m, op.Montants["tva1"]);
            Assert.Equal(1190.000m, op.Montants["ttc"]);
        }

        [Fact]
        public void MapBankTransactions_ShouldFormatDebitAndCreditCorrectly()
        {
            // Arrange
            var tx = new BankTransaction
            {
                Id = 1,
                BankId = 5,
                TransactionDate = new DateTime(2026, 8, 20),
                Reference = "VIR-9988",
                Description = "Virement reçu client XYZ",
                Debit = 1500.500m,
                Credit = 0m
            };

            // Act
            var results = _mapper.MapBankTransactions(new[] { tx });

            // Assert
            Assert.Single(results);
            var op = results[0];

            Assert.Equal("2026-08-20", op.DateOperation);
            Assert.Equal("580000", op.ContrePartie);
            Assert.Equal(1500.500m, op.Montants["debit"]);
            Assert.Equal(0m, op.Montants["credit"]);
        }

        [Fact]
        public void MapCaisseMovements_ShouldFormatEntreeAndSortieCorrectly()
        {
            // Arrange
            var cmSortie = new CaisseMovement
            {
                Id = 10,
                MovementDate = new DateTime(2026, 8, 20),
                Type = "SORTIE",
                Reason = "DEPENSE",
                Notes = "Paiement espèces fournisseur ABC",
                Amount = 250.000m
            };

            // Act
            var results = _mapper.MapCaisseMovements(new[] { cmSortie });

            // Assert
            Assert.Single(results);
            var op = results[0];

            Assert.Equal("2026-08-20", op.DateOperation);
            Assert.Equal("532000", op.ContrePartie);
            Assert.Equal(0m, op.Montants["debit"]);
            Assert.Equal(250.000m, op.Montants["credit"]);
        }

        [Fact]
        public async Task Controller_ShouldRejectInvalidType()
        {
            // Arrange
            var mockProvider = new Mock<IQwertyDataProvider>();
            var mockMapper = new Mock<IQwertyDataMapper>();
            var tenantContext = new TenantContext { IsEnabled = false };
            var mockLogger = new Mock<ILogger<QwertyImportController>>();

            var controller = new QwertyImportController(
                mockProvider.Object,
                mockMapper.Object,
                tenantContext,
                mockLogger.Object);

            // Act
            var result = await controller.Import("invalid_type", 2026, 8, 1) as BadRequestObjectResult;

            // Assert
            Assert.NotNull(result);
            var response = result!.Value as QwertyImportResponseDto;
            Assert.NotNull(response);
            Assert.False(response!.Ok);
            Assert.Contains("invalide", response.Error);
        }

        [Fact]
        public async Task Controller_ShouldRejectTenantMismatch()
        {
            // Arrange
            var mockProvider = new Mock<IQwertyDataProvider>();
            var mockMapper = new Mock<IQwertyDataMapper>();
            var tenantContext = new TenantContext { IsEnabled = true, Slug = "socobois" };
            var mockLogger = new Mock<ILogger<QwertyImportController>>();

            var controller = new QwertyImportController(
                mockProvider.Object,
                mockMapper.Object,
                tenantContext,
                mockLogger.Object);

            // Act: Request for tenant "other_tenant"
            var result = await controller.Import("vente", 2026, 8, 1, identifiant_dossier: "other_tenant") as ObjectResult;

            // Assert
            Assert.NotNull(result);
            Assert.Equal(StatusCodes.Status403Forbidden, result!.StatusCode);
            var response = result.Value as QwertyImportResponseDto;
            Assert.NotNull(response);
            Assert.False(response!.Ok);
            Assert.Contains("Accès refusé", response.Error);
        }
    }
}
