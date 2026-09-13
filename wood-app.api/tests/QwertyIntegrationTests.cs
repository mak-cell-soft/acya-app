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
        public void MapHoldingTaxes_ShouldFormatWithholdingTaxCorrectly()
        {
            // Arrange
            var supplier = new CounterPart
            {
                Id = 12,
                Name = "FOURNISSEUR ABC",
                TaxRegistrationNumber = "9876543B",
                Type = CounterPartType.Supplier
            };

            var doc = new Document
            {
                Id = 202,
                DocNumber = "FF-2026-88",
                TotalCostNetTTCDoc = 1190.0,
                CounterPart = supplier
            };

            var ht = new HoldingTax
            {
                Id = 5,
                Reference = "RS-2026-001",
                Description = "Retenue à la source 1.5%",
                TaxPercentage = 1.5,
                TaxValue = 17.850,
                NewAmountDocValue = 1172.150,
                CreationDate = new DateTime(2026, 8, 20),
                Documents = new List<Document> { doc }
            };

            // Act
            var results = _mapper.MapHoldingTaxes(new[] { ht });

            // Assert
            Assert.Single(results);
            var op = results[0];

            Assert.Equal("2026-08-20", op.DateOperation);
            Assert.Equal("RS-2026-001", op.Reference);
            Assert.Equal("9876543B", op.Fournisseur);
            Assert.Equal("1.5", op.Type);
            Assert.Equal(17.850m, op.Montants["rs"]);
            Assert.Equal(1190.000m, op.Montants["ttc"]);
            Assert.Equal(1172.150m, op.Montants["net"]);
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

        [Fact]
        public void MapPurchaseDocuments_WhenLineTvaValueIsZero_ShouldCalculateTvaFromCostDifferenceOrRate()
        {
            // Arrange: Reproducing the exact Socofeb tenant scenario where TvaValue on lines is 0
            var supplier = new CounterPart
            {
                Id = 5243,
                Name = "INTERBOIS",
                TaxRegistrationNumber = "0005243Q /A/M/ 000",
                Address = "Z.I La Charguia I",
                PhoneNumberOne = "25870052",
                Email = "interbois@planet.tn",
                Type = CounterPartType.Supplier
            };

            var tva19 = new AppVariable { Id = 1, Nature = "Tva", Name = "19%", Value = 19.0 };
            var article = new Article { Id = 10, Reference = "BOIS-CHENE", TVAs = tva19 };
            var merch = new Merchandise { Id = 20, Articles = article };

            var lines = new List<DocumentMerchandise>
            {
                new DocumentMerchandise
                {
                    Id = 501,
                    CostNetHT = 15327.756,
                    TvaValue = 0, // Stored as 0 in DB
                    CostTTC = 18240.028,
                    Merchandise = merch
                }
            };

            var doc = new Document
            {
                Id = 1083,
                Type = DocumentTypes.supplierInvoice,
                DocNumber = "FF-26-0002",
                SupplierReference = "A/2026/1083",
                Description = "Facture Directe Fournisseur via Portail Élancé",
                CreationDate = new DateTime(2026, 8, 5),
                TotalCostHTNetDoc = 15327.756,
                TotalCostTvaDoc = 2912.272,
                TotalCostNetTTCDoc = 18241.028,
                Taxes = new AppVariable { Id = 1, Nature = "Taxe", Name = "Timbre", Value = 1.0 },
                CounterPart = supplier,
                DocumentMerchandises = lines
            };

            // Act
            var results = _mapper.MapPurchaseDocuments(new[] { doc });

            // Assert
            Assert.Single(results);
            var op = results[0];

            Assert.Equal("2026-08-05", op.DateOperation);
            Assert.Equal("A/2026/1083", op.Facture);
            Assert.Equal("FF-26-0002", op.Reference);
            Assert.Equal("0005243Q /A/M/ 000", op.Fournisseur);
            Assert.Equal(15327.756m, op.Montants["ht1"]);
            Assert.Equal(2912.272m, op.Montants["tva1"]); // MUST NOT be 0!
            Assert.Equal(1.000m, op.Montants["timbre"]);
            Assert.Equal(18241.028m, op.Montants["ttc"]);
        }

        [Fact]
        public void MapPurchaseDocuments_WhenNoLinesAndHeaderTvaIsZero_ShouldDeduceTvaFromHeaderDifference()
        {
            // Arrange
            var supplier = new CounterPart
            {
                Id = 99,
                Name = "FOURNISSEUR XYZ",
                TaxRegistrationNumber = "9999999X",
                Type = CounterPartType.Supplier
            };

            var doc = new Document
            {
                Id = 303,
                Type = DocumentTypes.supplierInvoice,
                DocNumber = "FF-2026-99",
                CreationDate = new DateTime(2026, 8, 10),
                TotalCostHTNetDoc = 1000.0,
                TotalCostTvaDoc = 0, // Header TVA accidentally 0
                TotalCostNetTTCDoc = 1191.0, // 1000 HT + 190 TVA + 1 Timbre
                Taxes = new AppVariable { Id = 1, Nature = "Taxe", Name = "Timbre", Value = 1.0 },
                CounterPart = supplier,
                DocumentMerchandises = new List<DocumentMerchandise>() // Empty lines
            };

            // Act
            var results = _mapper.MapPurchaseDocuments(new[] { doc });

            // Assert
            Assert.Single(results);
            var op = results[0];
            Assert.Equal(1000.000m, op.Montants["ht1"]);
            Assert.Equal(190.000m, op.Montants["tva1"]);
            Assert.Equal(1.000m, op.Montants["timbre"]);
            Assert.Equal(1191.000m, op.Montants["ttc"]);
        }
    }
}
