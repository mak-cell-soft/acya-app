using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using ms.admin.api.acya.common.Enums;
using ms.admin.api.acya.Controllers;
using ms.admin.api.acya.core.DTOs;
using ms.admin.api.acya.core.Entities;
using ms.admin.api.acya.core.Interfaces;
using ms.admin.api.acya.infrastructure;
using ms.admin.api.acya.infrastructure.Repositories;
using ms.admin.api.acya.infrastructure.Services;
using ms.admin.api.acya.Services;
using Xunit;

namespace ms.admin.api.acya.tests
{
    public class BillingAndConnectionManagementTests
    {
        private MasterDbContext CreateInMemoryDbContext()
        {
            var options = new DbContextOptionsBuilder<MasterDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            return new MasterDbContext(options);
        }

        private static MasterEnterprise SeedEnterprise(
            MasterDbContext context,
            long id = 1,
            string slug = "mansour-construction",
            string name = "Mansour Construction",
            TenantPlan plan = TenantPlan.Starter,
            TenantStatus status = TenantStatus.Active,
            bool isActive = true,
            int maxConnectedUsers = 5)
        {
            var ent = new MasterEnterprise
            {
                Id = id,
                Slug = slug,
                Name = name,
                SchemaName = $"tenant_{slug.Replace("-", "_")}",
                ConnectionString = "Host=localhost;Database=wood-app-db;",
                Plan = plan,
                Status = status,
                IsActive = isActive,
                Currency = "TND",
                PlanPrice = 90.00m,
                MaxConnectedUsers = maxConnectedUsers,
                CreatedAt = DateTime.UtcNow.AddDays(-20),
                ActivatedAt = DateTime.UtcNow.AddDays(-20)
            };
            context.Enterprises.Add(ent);
            context.SaveChanges();
            return ent;
        }

        [Fact]
        public void Test14_UnauthorizedUsersCannotModifySubscriptionOrConnectionSettings_RequireSuperAdminRole()
        {
            var controllerType = typeof(BillingController);
            var authAttr = controllerType.GetCustomAttribute<AuthorizeAttribute>();
            Assert.NotNull(authAttr);
            Assert.Equal("SUPER_ADMIN", authAttr.Roles);

            var entControllerType = typeof(EnterpriseController);
            var entAuthAttr = entControllerType.GetCustomAttribute<AuthorizeAttribute>();
            Assert.NotNull(entAuthAttr);
            Assert.Equal("SUPER_ADMIN", entAuthAttr.Roles);
        }

        [Fact]
        public async Task Test1_And_Test2_OverdueInvoiceDoesNotDisconnectTenant_OnlyAdminCanManuallySuspend()
        {
            using var context = CreateInMemoryDbContext();
            var tenant = SeedEnterprise(context, id: 1, plan: TenantPlan.Starter, status: TenantStatus.Active, isActive: true);

            // Create active subscription and an overdue unpaid invoice
            context.TenantSubscriptions.Add(new TenantSubscription
            {
                TenantId = tenant.Id,
                Plan = TenantPlan.Starter,
                Status = SubscriptionStatuses.Active,
                StartDate = DateTime.UtcNow.AddDays(-15),
                EndDate = DateTime.UtcNow.AddDays(15),
                Price = 90.00m,
                CreatedAt = DateTime.UtcNow.AddDays(-15)
            });

            context.TenantInvoices.Add(new TenantInvoice
            {
                TenantId = tenant.Id,
                InvoiceNumber = "INV-2026-OVERDUE01",
                Amount = 100.00m,
                Currency = "TND",
                Status = InvoiceStatuses.Unpaid,
                BillingDate = DateTime.UtcNow.AddDays(-14),
                DueDate = DateTime.UtcNow.AddDays(-7), // 7 days overdue
                CreatedAt = DateTime.UtcNow.AddDays(-14)
            });
            await context.SaveChangesAsync();

            var dispatcher = new TenantBillingNotificationDispatcher(context);
            var scheduler = new SaaSLifecycleScheduler(null!, NullLogger<SaaSLifecycleScheduler>.Instance);

            // Run lifecycle evaluation
            await scheduler.ProcessSubscriptionAndBillingLifecycleAsync(context, dispatcher, CancellationToken.None);

            var refreshedTenant = await context.Enterprises.FindAsync(tenant.Id);
            var refreshedSub = await context.TenantSubscriptions.FirstAsync(s => s.TenantId == tenant.Id);
            var refreshedInv = await context.TenantInvoices.FirstAsync(i => i.TenantId == tenant.Id);

            // Invoice and subscription reflect OVERDUE status, but tenant connection remains ACTIVE (IsActive == true)
            Assert.Equal(InvoiceStatuses.Overdue, refreshedInv.Status);
            Assert.Equal(SubscriptionStatuses.Overdue, refreshedSub.Status);
            Assert.True(refreshedTenant!.IsActive);
            Assert.NotEqual(TenantStatus.Suspended, refreshedTenant.Status);

            // Verify administrator manual suspension works independently
            var repo = new EnterpriseRepository(context);
            var entController = new EnterpriseController(
                repo,
                Mock.Of<ITenantProvisioningService>(),
                context,
                Mock.Of<Microsoft.Extensions.Configuration.IConfiguration>(),
                Mock.Of<IEmailService>(),
                NullLogger<EnterpriseController>.Instance);

            var suspendResult = await entController.Suspend(tenant.Id);
            Assert.IsType<NoContentResult>(suspendResult);

            var suspendedTenant = await context.Enterprises.FindAsync(tenant.Id);
            Assert.False(suspendedTenant!.IsActive);
            Assert.Equal(TenantStatus.Suspended, suspendedTenant.Status);
        }

        [Fact]
        public async Task Test4_And_Test5_PaymentRemindersDispatchedAndDuplicatesPrevented()
        {
            using var context = CreateInMemoryDbContext();
            var tenant = SeedEnterprise(context, id: 10);

            context.TenantInvoices.Add(new TenantInvoice
            {
                TenantId = tenant.Id,
                InvoiceNumber = "INV-2026-REMIND7",
                Amount = 150.00m,
                Currency = "TND",
                Status = InvoiceStatuses.Unpaid,
                BillingDate = DateTime.UtcNow.Date.AddDays(-14),
                DueDate = DateTime.UtcNow.Date.AddDays(-7), // Exactly 7 days overdue -> cycle 1
                CreatedAt = DateTime.UtcNow.Date.AddDays(-14)
            });
            await context.SaveChangesAsync();

            var dispatcher = new TenantBillingNotificationDispatcher(context);

            // First trigger creates the notification
            bool firstAttempt = await dispatcher.TryCreateNotificationAsync(
                tenant.Id,
                "Rappel de paiement en retard (INV-2026-REMIND7)",
                "Facture en retard de 7 jours",
                notificationType: 2,
                priority: 2,
                relatedEntityType: "SaaSInvoice",
                relatedEntityId: "INV:INV-2026-REMIND7:OVERDUE_CYCLE_1");

            // Second trigger with same entity key is prevented (deduplicated)
            bool secondAttempt = await dispatcher.TryCreateNotificationAsync(
                tenant.Id,
                "Rappel de paiement en retard (INV-2026-REMIND7)",
                "Facture en retard de 7 jours",
                notificationType: 2,
                priority: 2,
                relatedEntityType: "SaaSInvoice",
                relatedEntityId: "INV:INV-2026-REMIND7:OVERDUE_CYCLE_1");

            Assert.True(firstAttempt);
            Assert.False(secondAttempt);
        }

        [Fact]
        public async Task Test6_And_Test7_PaymentRecordingUpdatesInvoiceBalancesInTnd_AndPreventsDuplicates()
        {
            using var context = CreateInMemoryDbContext();
            var tenant = SeedEnterprise(context, id: 20);
            var dispatcher = new TenantBillingNotificationDispatcher(context);
            var billingController = new BillingController(context, dispatcher);

            // 1. Reject non-TND currency
            var invalidEurRes = await billingController.CreateInvoice(tenant.Id, new BillingController.CreateInvoiceRequest
            {
                Amount = 100m,
                Currency = "EUR",
                DueDays = 30
            });
            Assert.IsType<BadRequestObjectResult>(invalidEurRes);

            // 2. Create valid TND invoice
            var createRes = await billingController.CreateInvoice(tenant.Id, new BillingController.CreateInvoiceRequest
            {
                Amount = 100.000m,
                DueDays = 30
            }) as OkObjectResult;
            Assert.NotNull(createRes);
            var createdInvoice = Assert.IsType<InvoiceDetailDto>(createRes.Value);
            Assert.Equal("TND", createdInvoice.Currency);
            Assert.Equal(100.000m, createdInvoice.Amount);
            Assert.Equal(100.000m, createdInvoice.RemainingBalance);
            Assert.Equal(InvoiceStatuses.Unpaid, createdInvoice.Status);

            // 3. Record partial payment of 40.000 TND
            var partialPayRes = await billingController.RegisterPayment(createdInvoice.Id, new BillingController.RegisterPaymentRequest
            {
                Amount = 40.000m,
                PaymentMethod = "WireTransfer",
                TransactionId = "TXN-PARTIAL-01"
            }) as OkObjectResult;
            Assert.NotNull(partialPayRes);

            // 4. Duplicate transaction ID is rejected with 409 Conflict
            var dupPayRes = await billingController.RegisterPayment(createdInvoice.Id, new BillingController.RegisterPaymentRequest
            {
                Amount = 10.000m,
                PaymentMethod = "WireTransfer",
                TransactionId = "TXN-PARTIAL-01"
            });
            Assert.IsType<ConflictObjectResult>(dupPayRes);

            // 5. Overpayment exceeding remaining 60.000 TND is rejected
            var overPayRes = await billingController.RegisterPayment(createdInvoice.Id, new BillingController.RegisterPaymentRequest
            {
                Amount = 75.000m,
                PaymentMethod = "WireTransfer",
                TransactionId = "TXN-OVER-01"
            });
            Assert.IsType<BadRequestObjectResult>(overPayRes);

            // 6. Verify invoice detail after partial payment
            var invListRes = await billingController.GetInvoices(tenant.Id) as OkObjectResult;
            var invList = Assert.IsAssignableFrom<IEnumerable<InvoiceDetailDto>>(invListRes!.Value).ToList();
            Assert.Single(invList);
            Assert.Equal(40.000m, invList[0].PaidAmount);
            Assert.Equal(60.000m, invList[0].RemainingBalance);
            Assert.Equal(InvoiceStatuses.PartiallyPaid, invList[0].Status);

            // 7. Record remaining 60.000 TND to settle invoice
            var finalPayRes = await billingController.RegisterPayment(createdInvoice.Id, new BillingController.RegisterPaymentRequest
            {
                Amount = 60.000m,
                PaymentMethod = "WireTransfer",
                TransactionId = "TXN-FINAL-02"
            }) as OkObjectResult;
            Assert.NotNull(finalPayRes);

            // 8. Verify summary shows 0.000 TND outstanding balance
            var summaryRes = await billingController.GetTenantBillingSummary(tenant.Id) as OkObjectResult;
            var summary = Assert.IsType<TenantBillingSummaryDto>(summaryRes!.Value);
            Assert.Equal(0m, summary.OutstandingBalance);
            Assert.Equal("TND", summary.Currency);
            Assert.NotNull(summary.LastPaymentDate);
        }

        [Fact]
        public async Task Test_Phase9_HistoricalEurAndUsdInvoicesRemainIdentifiable_AndAreNotMixedIntoTndOutstandingBalance()
        {
            using var context = CreateInMemoryDbContext();
            var tenant = SeedEnterprise(context, id: 25);
            var billingController = new BillingController(context);

            // Seed one historical EUR invoice (150.00 EUR), one historical USD invoice (200.00 USD), and one current TND invoice (300.000 TND)
            context.TenantInvoices.AddRange(
                new TenantInvoice
                {
                    Id = 1,
                    TenantId = tenant.Id,
                    InvoiceNumber = "INV-2025-HIST-EUR",
                    Amount = 150.00m,
                    Currency = "EUR",
                    Status = InvoiceStatuses.Unpaid,
                    BillingDate = DateTime.UtcNow.AddDays(-120),
                    DueDate = DateTime.UtcNow.AddDays(-90),
                    CreatedAt = DateTime.UtcNow.AddDays(-120)
                },
                new TenantInvoice
                {
                    Id = 2,
                    TenantId = tenant.Id,
                    InvoiceNumber = "INV-2025-HIST-USD",
                    Amount = 200.00m,
                    Currency = "USD",
                    Status = InvoiceStatuses.Unpaid,
                    BillingDate = DateTime.UtcNow.AddDays(-100),
                    DueDate = DateTime.UtcNow.AddDays(-70),
                    CreatedAt = DateTime.UtcNow.AddDays(-100)
                },
                new TenantInvoice
                {
                    Id = 3,
                    TenantId = tenant.Id,
                    InvoiceNumber = "INV-2026-CURR-TND",
                    Amount = 300.000m,
                    Currency = "TND",
                    Status = InvoiceStatuses.Unpaid,
                    BillingDate = DateTime.UtcNow.AddDays(-5),
                    DueDate = DateTime.UtcNow.AddDays(25),
                    CreatedAt = DateTime.UtcNow.AddDays(-5)
                }
            );
            await context.SaveChangesAsync();

            // 1. Verify GetInvoices preserves EUR, USD, and TND on each invoice record
            var invRes = await billingController.GetInvoices(tenant.Id) as OkObjectResult;
            var invoices = Assert.IsAssignableFrom<IEnumerable<InvoiceDetailDto>>(invRes!.Value).ToList();
            Assert.Equal(3, invoices.Count);

            var eurInv = invoices.Single(i => i.InvoiceNumber == "INV-2025-HIST-EUR");
            var usdInv = invoices.Single(i => i.InvoiceNumber == "INV-2025-HIST-USD");
            var tndInv = invoices.Single(i => i.InvoiceNumber == "INV-2026-CURR-TND");

            Assert.Equal("EUR", eurInv.Currency);
            Assert.Equal(150.00m, eurInv.RemainingBalance);
            Assert.Equal("USD", usdInv.Currency);
            Assert.Equal(200.00m, usdInv.RemainingBalance);
            Assert.Equal("TND", tndInv.Currency);
            Assert.Equal(300.000m, tndInv.RemainingBalance);

            // 2. Verify GetTenantBillingSummary does NOT combine EUR/USD into TND OutstandingBalance
            var summaryRes = await billingController.GetTenantBillingSummary(tenant.Id) as OkObjectResult;
            var summary = Assert.IsType<TenantBillingSummaryDto>(summaryRes!.Value);
            Assert.Equal("TND", summary.Currency);
            Assert.Equal(300.000m, summary.OutstandingBalance);
            Assert.Equal(150.00m, summary.HistoricalBalancesByCurrency["EUR"]);
            Assert.Equal(200.00m, summary.HistoricalBalancesByCurrency["USD"]);
        }

        [Fact]
        public async Task Test8_Test9_Test10_Test12_DefaultConnectionLimitIs5_AdminCanIncreaseAndDecrease_PreservingExistingSessions()
        {
            using var context = CreateInMemoryDbContext();
            var tenant = SeedEnterprise(context, id: 30);
            var billingController = new BillingController(context);

            // Default connection limit is 5
            var initialConnRes = await billingController.GetTenantConnections(tenant.Id) as OkObjectResult;
            var initialConn = Assert.IsType<TenantConnectionSummaryDto>(initialConnRes!.Value);
            Assert.Equal(5, initialConn.MaxConnectedUsers);
            Assert.Equal(0, initialConn.ConnectedUsers);
            Assert.Equal(5, initialConn.AvailableSlots);

            // Seed 4 active concurrent sessions
            for (int i = 1; i <= 4; i++)
            {
                context.TenantActiveSessions.Add(new TenantActiveSession
                {
                    SessionId = $"sess-{i}",
                    TenantId = tenant.Id,
                    TenantSlug = tenant.Slug,
                    UserId = i,
                    Username = $"user{i}",
                    CreatedAt = DateTime.UtcNow.AddMinutes(-10),
                    ExpiresAt = DateTime.UtcNow.AddHours(4),
                    IsRevoked = false
                });
            }
            await context.SaveChangesAsync();

            // Admin increases limit to 10
            var increaseRes = await billingController.UpdateConnectionLimit(tenant.Id, new UpdateConnectionLimitRequest
            {
                MaxConnectedUsers = 10
            }) as OkObjectResult;
            var increased = Assert.IsType<TenantConnectionSummaryDto>(increaseRes!.Value);
            Assert.Equal(10, increased.MaxConnectedUsers);
            Assert.Equal(4, increased.ConnectedUsers);
            Assert.Equal(6, increased.AvailableSlots);

            // Admin decreases limit to 2 (below currently connected 4 sessions)
            var decreaseRes = await billingController.UpdateConnectionLimit(tenant.Id, new UpdateConnectionLimitRequest
            {
                MaxConnectedUsers = 2
            }) as OkObjectResult;
            var decreased = Assert.IsType<TenantConnectionSummaryDto>(decreaseRes!.Value);
            Assert.Equal(2, decreased.MaxConnectedUsers);
            Assert.Equal(4, decreased.ConnectedUsers); // Existing 4 sessions are NOT disconnected!
            Assert.Equal(0, decreased.AvailableSlots);
            Assert.True(decreased.IsExceedingLimit);

            // Verify all 4 active sessions remain unrevoked in database
            var remainingActiveSessions = await context.TenantActiveSessions
                .CountAsync(s => s.TenantId == tenant.Id && !s.IsRevoked);
            Assert.Equal(4, remainingActiveSessions);

            // Verify audit logs recorded both administrative changes
            var limitAuditLogs = await context.MasterAuditLogs
                .Where(a => a.TenantId == tenant.Id && a.Action == "Connection Limit Updated")
                .ToListAsync();
            Assert.Equal(2, limitAuditLogs.Count);
        }
    }
}
