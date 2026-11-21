using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Moq;
using ms.webapp.api.acya.api.Interfaces;
using ms.webapp.api.acya.api.Services;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs;
using ms.webapp.api.acya.infrastructure;
using ms.webapp.api.acya.infrastructure.Repositories;
using Xunit;

namespace ms.webapp.api.acya.tests
{
    public class PaymentTreasuryAndAccountingTests
    {
        private readonly WoodAppContext _context;
        private readonly PaymentRepository _paymentRepository;
        private readonly CaisseMovementRepository _caisseRepository;
        private readonly BankDepositRepository _bankDepositRepository;
        private readonly DocumentRepository _documentRepository;
        private readonly CounterPartRepository _counterPartRepository;
        private readonly AppUserRepository _appUserRepository;
        private readonly Mock<IAccountService> _accountServiceMock;
        private readonly Mock<IBalanceService> _balanceServiceMock;
        private readonly PaymentService _paymentService;

        public PaymentTreasuryAndAccountingTests()
        {
            var options = new DbContextOptionsBuilder<WoodAppContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .ConfigureWarnings(x => x.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
                .Options;

            _context = new WoodAppContext(options);
            var docMerchRepo = new DocumentMerchandiseRepository(_context);
            var stockRepo = new StockRepository(_context, docMerchRepo);

            _paymentRepository = new PaymentRepository(_context);
            _caisseRepository = new CaisseMovementRepository(_context);
            _bankDepositRepository = new BankDepositRepository(_context);
            _documentRepository = new DocumentRepository(_context, stockRepo);
            _counterPartRepository = new CounterPartRepository(_context);
            _appUserRepository = new AppUserRepository(_context);
            _accountServiceMock = new Mock<IAccountService>();
            _balanceServiceMock = new Mock<IBalanceService>();

            _paymentService = new PaymentService(
                _paymentRepository,
                _documentRepository,
                _counterPartRepository,
                _appUserRepository,
                _accountServiceMock.Object,
                _balanceServiceMock.Object,
                _context);
        }

        private async Task SeedBaseDataAsync()
        {
            _context.SalesSites.Add(new SalesSite { Id = 1, Address = "Charguia I", IsForSale = true, IsDeleted = false });
            _context.AppUsers.Add(new AppUser { Id = 1, Login = "aymen.nefzi", IdSalesSite = 1, IsActive = true });

            _context.CounterParts.AddRange(
                new CounterPart
                {
                    Id = 11,
                    Type = CounterPartType.Supplier,
                    Name = "FOUBOIS_1",
                    FirstName = "Abdelmajid",
                    LastName = "HOUMIA",
                    IsDeleted = false
                },
                new CounterPart
                {
                    Id = 12,
                    Type = CounterPartType.Supplier,
                    Name = "FOUMDF_2",
                    FirstName = "Mohamed",
                    LastName = "CMT",
                    IsDeleted = false
                },
                new CounterPart
                {
                    Id = 22,
                    Type = CounterPartType.Customer,
                    Name = "",
                    FirstName = "Ahmed",
                    LastName = "MANSOURI",
                    IsDeleted = false
                },
                new CounterPart
                {
                    Id = 24,
                    Type = CounterPartType.Customer,
                    Name = "Operation SARL",
                    FirstName = "Saber",
                    LastName = "BANNANI",
                    IsDeleted = false
                }
            );

            _context.Documents.AddRange(
                new Document
                {
                    Id = 3,
                    DocNumber = "FF-26-001",
                    SupplierReference = "F-EXT-001",
                    Type = DocumentTypes.supplierInvoice,
                    CounterPartId = 12,
                    SalesSiteId = 1,
                    TotalCostNetTTCDoc = 5000,
                    BillingStatus = BillingStatus.NotBilled,
                    CreationDate = new DateTime(2026, 8, 19),
                    IsDeleted = false
                },
                new Document
                {
                    Id = 20,
                    DocNumber = "FF-26-002",
                    SupplierReference = "F-EXT-002",
                    Type = DocumentTypes.supplierInvoice,
                    CounterPartId = 11,
                    SalesSiteId = 1,
                    TotalCostNetTTCDoc = 2000,
                    BillingStatus = BillingStatus.NotBilled,
                    CreationDate = new DateTime(2026, 11, 16),
                    IsDeleted = false
                },
                new Document
                {
                    Id = 7,
                    DocNumber = "FC-26-001",
                    Type = DocumentTypes.customerInvoice,
                    CounterPartId = 24,
                    SalesSiteId = 1,
                    TotalCostNetTTCDoc = 1500,
                    BillingStatus = BillingStatus.NotBilled,
                    CreationDate = new DateTime(2026, 8, 20),
                    IsDeleted = false
                },
                new Document
                {
                    Id = 21,
                    DocNumber = "BL-26-008",
                    Type = DocumentTypes.customerDeliveryNote,
                    CounterPartId = 22,
                    SalesSiteId = 1,
                    TotalCostNetTTCDoc = 1200,
                    BillingStatus = BillingStatus.NotBilled,
                    CreationDate = new DateTime(2026, 11, 16),
                    IsDeleted = false
                }
            );

            _context.Banks.Add(new Bank
            {
                Id = 1,
                Reference = "BIAT",
                Designation = "BANQUE INTERNATIONALE ARABE DE TUNISIE",
                Rib = "05045151004587992584",
                InitialBalance = 5000m,
                IsDeleted = false
            });

            await _context.SaveChangesAsync();
        }

        [Fact]
        public async Task Task1_AdvancedPaymentSearch_FiltersDatesSuppliersCustomersAndPaginationCorrectly()
        {
            await SeedBaseDataAsync();

            _context.Payments.AddRange(
                new Payment
                {
                    Id = 1,
                    DocumentId = 7,
                    CustomerId = 24,
                    PaymentDate = new DateTime(2026, 8, 20, 0, 0, 0),
                    Amount = 300m,
                    PaymentMethod = "ESPECE",
                    Reference = "",
                    CreatedAt = new DateTime(2026, 8, 20, 5, 54, 0),
                    IsDeleted = false
                },
                new Payment
                {
                    Id = 2,
                    DocumentId = null,
                    CustomerId = 22,
                    PaymentDate = new DateTime(2026, 8, 19, 0, 0, 0),
                    Amount = 320m,
                    PaymentMethod = "CHEQUE",
                    Reference = "ENC-260819-001",
                    CreatedAt = new DateTime(2026, 8, 19, 9, 53, 0),
                    IsDeleted = false,
                    PaymentInstrument = new PaymentInstrument
                    {
                        Id = 1,
                        PaymentId = 2,
                        Type = "CHEQUE",
                        InstrumentNumber = "112498",
                        Bank = "Amen Bank"
                    }
                },
                new Payment
                {
                    Id = 3,
                    DocumentId = 3,
                    CustomerId = 12,
                    PaymentDate = new DateTime(2026, 11, 16, 0, 0, 0),
                    Amount = 1000m,
                    PaymentMethod = "TRAITE",
                    Reference = "",
                    CreatedAt = new DateTime(2026, 11, 16, 8, 40, 0),
                    IsDeleted = false,
                    PaymentInstrument = new PaymentInstrument
                    {
                        Id = 2,
                        PaymentId = 3,
                        Type = "TRAITE",
                        InstrumentNumber = "78445",
                        Bank = "Attijari Bank"
                    }
                },
                new Payment
                {
                    Id = 4,
                    DocumentId = 21,
                    CustomerId = 22,
                    PaymentDate = new DateTime(2026, 11, 16, 14, 30, 0), // Non-midnight timestamp on ToDate
                    Amount = 500m,
                    PaymentMethod = "VIREMENT",
                    Reference = "VIR-2026-01",
                    CreatedAt = new DateTime(2026, 11, 16, 14, 30, 0),
                    IsDeleted = false
                }
            );
            await _context.SaveChangesAsync();

            // 1. Search without filters returns all 4 payments (both customer and supplier)
            var allResult = await _paymentService.SearchAsync(new PaymentSearchDto { PageNumber = 1, PageSize = 10 });
            Assert.Equal(4, allResult.TotalCount);

            // 2. Search by Date Range including non-midnight timestamp on ToDate (2026-11-16 to 2026-11-16)
            var nov16Result = await _paymentService.SearchAsync(new PaymentSearchDto
            {
                FromDate = new DateTime(2026, 11, 16),
                ToDate = new DateTime(2026, 11, 16),
                PageNumber = 1,
                PageSize = 10
            });
            Assert.Equal(2, nov16Result.TotalCount);
            Assert.Contains(nov16Result.Items, p => p.PaymentId == 4);

            // 3. Search by Payment Method (CHEQUE)
            var chequeResult = await _paymentService.SearchAsync(new PaymentSearchDto
            {
                PaymentMethod = "CHEQUE",
                PageNumber = 1,
                PageSize = 10
            });
            Assert.Equal(1, chequeResult.TotalCount);
            Assert.Equal("ENC-260819-001", chequeResult.Items.First().Reference);

            // 4. Search by Supplier (CounterpartType = Supplier & text search by supplier name / doc number)
            var supplierResult = await _paymentService.SearchAsync(new PaymentSearchDto
            {
                CounterpartType = "Supplier",
                PageNumber = 1,
                PageSize = 10
            });
            Assert.Equal(1, supplierResult.TotalCount);
            Assert.Equal("Supplier", supplierResult.Items.First().CounterpartType);
            Assert.Equal("FF-26-001", supplierResult.Items.First().DocumentNumber);

            // Case-insensitive search by document number "ff-26-001"
            var docSearchResult = await _paymentService.SearchAsync(new PaymentSearchDto
            {
                Search = "ff-26-001",
                PageNumber = 1,
                PageSize = 10
            });
            Assert.Equal(1, docSearchResult.TotalCount);
            Assert.Equal(3, docSearchResult.Items.First().PaymentId);

            // 5. Search by Customer full name ("ahmed mansouri" case-insensitive)
            var customerSearchResult = await _paymentService.SearchAsync(new PaymentSearchDto
            {
                Search = "ahmed mansouri",
                CounterpartType = "Customer",
                PageNumber = 1,
                PageSize = 10
            });
            Assert.Equal(2, customerSearchResult.TotalCount);
            Assert.All(customerSearchResult.Items, p => Assert.Equal("Customer", p.CounterpartType));

            // 6. Combined filters (Customer + Nature=RECOUVREMENT + PaymentMethod=CHEQUE)
            var combinedResult = await _paymentService.SearchAsync(new PaymentSearchDto
            {
                CounterpartType = "Customer",
                Nature = "RECOUVREMENT",
                PaymentMethod = "CHEQUE",
                FromDate = new DateTime(2026, 8, 1),
                ToDate = new DateTime(2026, 8, 31),
                PageNumber = 1,
                PageSize = 10
            });
            Assert.Equal(1, combinedResult.TotalCount);
            Assert.Equal(2, combinedResult.Items.First().PaymentId);

            // 7. Empty results
            var emptyResult = await _paymentService.SearchAsync(new PaymentSearchDto
            {
                Search = "NON_EXISTENT_REFERENCE_99999",
                PageNumber = 1,
                PageSize = 10
            });
            Assert.Equal(0, emptyResult.TotalCount);
            Assert.Empty(emptyResult.Items);

            // 8. Pagination
            var page1 = await _paymentService.SearchAsync(new PaymentSearchDto { PageNumber = 1, PageSize = 2 });
            var page2 = await _paymentService.SearchAsync(new PaymentSearchDto { PageNumber = 2, PageSize = 2 });
            Assert.Equal(2, page1.Items.Count());
            Assert.Equal(2, page2.Items.Count());
            Assert.Empty(page1.Items.Select(p => p.PaymentId).Intersect(page2.Items.Select(p => p.PaymentId)));
        }

        [Fact]
        public async Task Task2_Scenario1_SupplierCashPayment_WithSufficientMainCaisseBalance_ReducesMainCaisseAndCreatesOutgoingMovement()
        {
            await SeedBaseDataAsync();

            // Seed Main Cash Register (Caisse Principale) with 1,000 TND via REMISE_CENTRALE
            _context.CaisseMovements.AddRange(
                new CaisseMovement
                {
                    Id = 1,
                    SalesSiteId = 1,
                    MovementDate = DateTime.UtcNow.AddHours(-2),
                    Type = "ENTREE",
                    Reason = "ENCAISSEMENT",
                    Amount = 1500m,
                    Reference = "FC-26-001",
                    IsDeleted = false
                },
                new CaisseMovement
                {
                    Id = 2,
                    SalesSiteId = 1,
                    MovementDate = DateTime.UtcNow.AddHours(-1),
                    Type = "SORTIE",
                    Reason = "REMISE_CENTRALE",
                    Amount = 1000m,
                    Reference = "REF-001",
                    IsDeleted = false
                }
            );
            await _context.SaveChangesAsync();

            // Verify initial balances: Main Cash Register = 1,000 TND, POS Site 1 = 500 TND
            Assert.Equal(1000m, await _caisseRepository.GetCaissePrincipaleBalanceAsync());
            Assert.Equal(500m, await _caisseRepository.GetBalanceBySiteAsync(1));

            // Pay Supplier Invoice FF-26-002 (200 TND in ESPECE)
            var createdPayment = await _paymentService.CreateAsync(new CreatePaymentDto
            {
                DocumentId = 20,
                CustomerId = 11,
                PaymentDate = DateTime.UtcNow,
                Amount = 200m,
                PaymentMethod = "ESPECE",
                updatedbyid = 1
            }, 1);

            Assert.NotNull(createdPayment);
            Assert.Equal(200m, createdPayment.Amount);
            Assert.Equal("Supplier", createdPayment.CounterpartType);

            // Expected Main Cash Register balance: 1,000 - 200 = 800 TND
            var newMainCaisseBalance = await _caisseRepository.GetCaissePrincipaleBalanceAsync();
            Assert.Equal(800m, newMainCaisseBalance);

            // Expected movement: 200 TND outgoing (SORTIE / REGLEMENT_FOURNISSEUR), NOT ENTREE / ENCAISSEMENT
            var movement = await _context.CaisseMovements.FirstOrDefaultAsync(m => m.PaymentId == createdPayment.PaymentId);
            Assert.NotNull(movement);
            Assert.Equal("SORTIE", movement!.Type);
            Assert.Equal("REGLEMENT_FOURNISSEUR", movement.Reason);
            Assert.Equal(200m, movement.Amount);

            // POS site drawer balance must remain 500 TND (not increased by supplier payment and not double-deducted)
            Assert.Equal(500m, await _caisseRepository.GetBalanceBySiteAsync(1));
        }

        [Fact]
        public async Task Task2_Scenario2_SupplierCashPayment_WithInsufficientMainCaisseBalance_IsRejectedAtomically()
        {
            await SeedBaseDataAsync();

            // Seed Main Cash Register (Caisse Principale) with 100 TND
            _context.CaisseMovements.Add(new CaisseMovement
            {
                Id = 1,
                SalesSiteId = 1,
                MovementDate = DateTime.UtcNow.AddHours(-1),
                Type = "SORTIE",
                Reason = "REMISE_CENTRALE",
                Amount = 100m,
                Reference = "REF-001",
                IsDeleted = false
            });
            await _context.SaveChangesAsync();

            Assert.Equal(100m, await _caisseRepository.GetCaissePrincipaleBalanceAsync());

            // Attempt Supplier cash payment of 200 TND -> must be rejected
            var ex = await Assert.ThrowsAsync<InvalidOperationException>(async () =>
            {
                await _paymentService.CreateAsync(new CreatePaymentDto
                {
                    DocumentId = 20,
                    CustomerId = 11,
                    PaymentDate = DateTime.UtcNow,
                    Amount = 200m,
                    PaymentMethod = "ESPECE",
                    updatedbyid = 1
                }, 1);
            });

            Assert.Contains("Solde insuffisant dans la Caisse Principale", ex.Message);

            // Balance must remain 100 TND and no payment or movement created
            Assert.Equal(100m, await _caisseRepository.GetCaissePrincipaleBalanceAsync());
            Assert.Equal(0, await _context.Payments.CountAsync());
            Assert.Equal(1, await _context.CaisseMovements.CountAsync());
        }

        [Fact]
        public async Task Task2_ConcurrentSupplierCashPayments_CannotOverspendMainCaisseBalance()
        {
            var dbName = Guid.NewGuid().ToString();
            DbContextOptions<WoodAppContext> CreateOptions() =>
                new DbContextOptionsBuilder<WoodAppContext>()
                    .UseInMemoryDatabase(databaseName: dbName)
                    .ConfigureWarnings(x => x.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
                    .Options;

            using (var seedCtx = new WoodAppContext(CreateOptions()))
            {
                seedCtx.SalesSites.Add(new SalesSite { Id = 1, Address = "Charguia I", IsForSale = true, IsDeleted = false });
                seedCtx.AppUsers.Add(new AppUser { Id = 1, Login = "aymen.nefzi", IdSalesSite = 1, IsActive = true });
                seedCtx.CounterParts.Add(new CounterPart { Id = 11, Type = CounterPartType.Supplier, Name = "FOUBOIS_1", IsDeleted = false });
                seedCtx.Documents.Add(new Document
                {
                    Id = 20,
                    DocNumber = "FF-26-002",
                    Type = DocumentTypes.supplierInvoice,
                    CounterPartId = 11,
                    SalesSiteId = 1,
                    TotalCostNetTTCDoc = 2000,
                    BillingStatus = BillingStatus.NotBilled,
                    CreationDate = DateTime.UtcNow,
                    IsDeleted = false
                });
                seedCtx.CaisseMovements.Add(new CaisseMovement
                {
                    Id = 1,
                    SalesSiteId = 1,
                    MovementDate = DateTime.UtcNow.AddHours(-1),
                    Type = "SORTIE",
                    Reason = "REMISE_CENTRALE",
                    Amount = 1000m,
                    Reference = "REF-001",
                    IsDeleted = false
                });
                await seedCtx.SaveChangesAsync();
            }

            PaymentService CreateIsolatedService(WoodAppContext ctx)
            {
                var docMerchRepo = new DocumentMerchandiseRepository(ctx);
                var stockRepo = new StockRepository(ctx, docMerchRepo);
                return new PaymentService(
                    new PaymentRepository(ctx),
                    new DocumentRepository(ctx, stockRepo),
                    new CounterPartRepository(ctx),
                    new AppUserRepository(ctx),
                    new Mock<IAccountService>().Object,
                    new Mock<IBalanceService>().Object,
                    ctx);
            }

            using var ctx1 = new WoodAppContext(CreateOptions());
            using var ctx2 = new WoodAppContext(CreateOptions());
            var svc1 = CreateIsolatedService(ctx1);
            var svc2 = CreateIsolatedService(ctx2);

            int successCount = 0;
            int failCount = 0;

            var task1 = Task.Run(async () =>
            {
                try
                {
                    await svc1.CreateAsync(new CreatePaymentDto
                    {
                        DocumentId = 20,
                        CustomerId = 11,
                        PaymentDate = DateTime.UtcNow,
                        Amount = 600m,
                        PaymentMethod = "ESPECE",
                        updatedbyid = 1
                    }, 1);
                    System.Threading.Interlocked.Increment(ref successCount);
                }
                catch (InvalidOperationException)
                {
                    System.Threading.Interlocked.Increment(ref failCount);
                }
            });

            var task2 = Task.Run(async () =>
            {
                try
                {
                    await svc2.CreateAsync(new CreatePaymentDto
                    {
                        DocumentId = 20,
                        CustomerId = 11,
                        PaymentDate = DateTime.UtcNow,
                        Amount = 600m,
                        PaymentMethod = "ESPECE",
                        updatedbyid = 1
                    }, 1);
                    System.Threading.Interlocked.Increment(ref successCount);
                }
                catch (InvalidOperationException)
                {
                    System.Threading.Interlocked.Increment(ref failCount);
                }
            });

            await Task.WhenAll(task1, task2);

            Assert.Equal(1, successCount);
            Assert.Equal(1, failCount);

            using var verifyCtx = new WoodAppContext(CreateOptions());
            var verifyCaisseRepo = new CaisseMovementRepository(verifyCtx);
            Assert.Equal(400m, await verifyCaisseRepo.GetCaissePrincipaleBalanceAsync());
        }

        [Fact]
        public async Task Task2_Scenario3_NonCashSupplierPayment_BankTransfer_LeavesMainCaisseUnchangedAndAffectsBank()
        {
            await SeedBaseDataAsync();

            // Seed Main Cash Register with 1,000 TND
            _context.CaisseMovements.Add(new CaisseMovement
            {
                Id = 1,
                SalesSiteId = 1,
                MovementDate = DateTime.UtcNow.AddHours(-1),
                Type = "SORTIE",
                Reason = "REMISE_CENTRALE",
                Amount = 1000m,
                Reference = "REF-001",
                IsDeleted = false
            });
            await _context.SaveChangesAsync();

            // Pay Supplier Invoice FF-26-002 (300 TND via VIREMENT on BankId = 1)
            var payment = await _paymentService.CreateAsync(new CreatePaymentDto
            {
                DocumentId = 20,
                CustomerId = 11,
                PaymentDate = DateTime.UtcNow,
                Amount = 300m,
                PaymentMethod = "VIREMENT",
                Reference = "VIR-FOURN-001",
                BankId = 1,
                updatedbyid = 1
            }, 1);

            Assert.NotNull(payment);

            // Main Cash Register balance must be unchanged (1,000 TND)
            Assert.Equal(1000m, await _caisseRepository.GetCaissePrincipaleBalanceAsync());

            // Bank 1 net deposits must be -300 TND (InitialBalance 5000 - 300 = 4700 TND)
            var totalNetDeposits = await _bankDepositRepository.GetTotalNetsByBankAsync(1);
            Assert.Equal(-300m, totalNetDeposits);

            // BankTransaction created with Credit = 300, Debit = 0
            var bankTx = await _context.BankTransactions.FirstOrDefaultAsync(t => t.BankId == 1 && t.Reference == "VIR-FOURN-001");
            Assert.NotNull(bankTx);
            Assert.Equal(300m, bankTx!.Credit);
            Assert.Equal(0m, bankTx.Debit);
        }

        [Fact]
        public async Task Task3_AccountingSupplierPayments_IncludesAllPaymentMethodsPartialPaymentsAndAccurateMetadata()
        {
            await SeedBaseDataAsync();

            // Seed Main Cash Register with 2,000 TND for cash supplier payment
            _context.CaisseMovements.Add(new CaisseMovement
            {
                Id = 1,
                SalesSiteId = 1,
                MovementDate = new DateTime(2026, 11, 10),
                Type = "SORTIE",
                Reason = "REMISE_CENTRALE",
                Amount = 2000m,
                Reference = "REF-001",
                IsDeleted = false
            });
            await _context.SaveChangesAsync();

            // Create 4 partial payments on Supplier Invoice FF-26-001 (DocId = 3, Total = 5000):
            // 1. ESPECE (500 TND)
            await _paymentService.CreateAsync(new CreatePaymentDto
            {
                DocumentId = 3,
                CustomerId = 12,
                PaymentDate = new DateTime(2026, 11, 12),
                Amount = 500m,
                PaymentMethod = "ESPECE",
                Reference = "ESP-001",
                updatedbyid = 1
            }, 1);

            // 2. VIREMENT (1000 TND)
            await _paymentService.CreateAsync(new CreatePaymentDto
            {
                DocumentId = 3,
                CustomerId = 12,
                PaymentDate = new DateTime(2026, 11, 14),
                Amount = 1000m,
                PaymentMethod = "VIREMENT",
                Reference = "VIR-001",
                BankId = 1,
                updatedbyid = 1
            }, 1);

            // 3. CHEQUE (1500 TND)
            await _paymentService.CreateAsync(new CreatePaymentDto
            {
                DocumentId = 3,
                CustomerId = 12,
                PaymentDate = new DateTime(2026, 11, 15),
                Amount = 1500m,
                PaymentMethod = "CHEQUE",
                InstrumentDetails = new PaymentInstrumentDto
                {
                    InstrumentNumber = "CHQ-9988",
                    Bank = "BIAT",
                    Owner = "FOUMDF_2",
                    DueDate = new DateTime(2026, 11, 30)
                },
                updatedbyid = 1
            }, 1);

            // 4. TRAITE (2000 TND)
            await _paymentService.CreateAsync(new CreatePaymentDto
            {
                DocumentId = 3,
                CustomerId = 12,
                PaymentDate = new DateTime(2026, 11, 16),
                Amount = 2000m,
                PaymentMethod = "TRAITE",
                InstrumentDetails = new PaymentInstrumentDto
                {
                    InstrumentNumber = "TRT-7766",
                    Bank = "Attijari Bank",
                    Owner = "FOUMDF_2",
                    DueDate = new DateTime(2026, 12, 31)
                },
                updatedbyid = 1
            }, 1);

            // Also add a Customer payment in November 2026 to verify it is NOT included in supplier payments
            await _paymentService.CreateAsync(new CreatePaymentDto
            {
                DocumentId = 21,
                CustomerId = 22,
                PaymentDate = new DateTime(2026, 11, 16),
                Amount = 400m,
                PaymentMethod = "ESPECE",
                updatedbyid = 1
            }, 1);

            // Query Accounting Supplier Payments for November 2026 (monthOnly = true, allSites = true)
            var supplierPayments = (await _paymentService.GetDashboardPaymentsAsync(
                new DateTime(2026, 11, 1),
                userId: 1,
                documentSide: "supplier",
                monthOnly: true,
                allSites: true)).ToList();

            Assert.Equal(4, supplierPayments.Count);
            Assert.Equal(5000m, supplierPayments.Sum(p => p.Amount));

            // Every payment must have InvoiceNumber = "FF-26-001" and SupplierReference = "F-EXT-001" and CustomerName = "FOUMDF_2"
            Assert.All(supplierPayments, p =>
            {
                Assert.Equal("FF-26-001", p.InvoiceNumber);
                Assert.Equal("F-EXT-001", p.SupplierReference);
                Assert.Equal("FOUMDF_2", p.CustomerName);
            });

            // Verify all 4 methods are represented
            Assert.Contains(supplierPayments, p => p.PaymentMethod == "ESPECE" && p.Amount == 500m && p.PaymentStatus == "CONFIRMED");
            Assert.Contains(supplierPayments, p => p.PaymentMethod == "VIREMENT" && p.Amount == 1000m && p.PaymentStatus == "CONFIRMED");
            Assert.Contains(supplierPayments, p => p.PaymentMethod == "CHEQUE" && p.Amount == 1500m && p.InstrumentNumber == "CHQ-9988" && p.PaymentStatus == "PENDING");
            Assert.Contains(supplierPayments, p => p.PaymentMethod == "TRAITE" && p.Amount == 2000m && p.InstrumentNumber == "TRT-7766" && p.PaymentStatus == "PENDING");

            // Query with custom date range (2026-11-12 to 2026-11-14) -> returns only ESPECE and VIREMENT
            var customRangePayments = (await _paymentService.GetDashboardPaymentsAsync(
                new DateTime(2026, 11, 1),
                userId: 1,
                documentSide: "supplier",
                monthOnly: false,
                allSites: true,
                fromDate: new DateTime(2026, 11, 12),
                toDate: new DateTime(2026, 11, 14))).ToList();

            Assert.Equal(2, customRangePayments.Count);
            Assert.Equal(1500m, customRangePayments.Sum(p => p.Amount));
        }
    }
}
