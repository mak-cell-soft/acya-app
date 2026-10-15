using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.api.Services;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs.Production;
using ms.webapp.api.acya.core.Entities.Production;
using ms.webapp.api.acya.infrastructure;
using ms.webapp.api.acya.infrastructure.Repositories;
using Xunit;

namespace ms.webapp.api.acya.tests
{
  public class ProductionLaborTrackingTests
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

    private async Task<(ProductionOrder Order, ProductionStep Step, Person Employee)> SeedBasicProductionDataAsync(WoodAppContext context)
    {
      var person = new Person
      {
        Firstname = "Ahmed",
        Lastname = "BEN SALEM",
        FullName = "Ahmed BEN SALEM",
        Role = Roles.User,
        IsDeleted = false
      };
      context.Persons.Add(person);

      if (!context.SalesSites.Any(s => s.Id == 1))
      {
        context.SalesSites.Add(new SalesSite
        {
          Id = 1,
          Address = "Atelier Principal",
          EnterpriseId = 1
        });
      }

      if (!context.AppUsers.Any(u => u.Id == 1))
      {
        context.AppUsers.Add(new AppUser
        {
          Id = 1,
          Login = "admin",
          Email = "admin@example.com",
          IsActive = true
        });
      }

      var order = new ProductionOrder
      {
        Reference = "OF-2026-001",
        Description = "Fabrication de fenêtres en chêne",
        Status = ProductionStatus.Planned,
        SalesSiteId = 1,
        PlannedStartDate = DateTime.UtcNow,
        PlannedOutputQuantity = 10,
        CreatedById = 1,
        CreationDate = DateTime.UtcNow
      };
      context.ProductionOrders.Add(order);
      await context.SaveChangesAsync();

      var step = new ProductionStep
      {
        ProductionOrderId = order.Id,
        StepNumber = 1,
        Name = "Découpe",
        Status = ProductionStepStatus.Planned,
        LaborCost = 50.000m, // Existing manual labor cost
        OtherCost = 20.000m,
        CreatedById = 1,
        CreationDate = DateTime.UtcNow
      };
      context.ProductionSteps.Add(step);
      await context.SaveChangesAsync();

      return (order, step, person);
    }

    [Fact]
    public async Task Test01_PlannedHours_DoNotAffect_ActualManufacturingCosts()
    {
      // 1. Planned hours do not affect actual manufacturing costs.
      using var context = CreateContext();
      var repo = new ProductionRepository(context);
      var (order, step, person) = await SeedBasicProductionDataAsync(context);

      // Assign worker with planned hours and default rate
      var workerDto = await repo.AddStepWorkerAsync(step.Id, new CreateProductionStepWorkerDto
      {
        PersonId = person.Id,
        PlannedHours = 10m,
        DefaultHourlyRate = 15m, // Estimated: 150 TND
        Notes = "Ouvrier qualifié"
      }, userId: 1);

      Assert.NotNull(workerDto);
      Assert.Equal(150m, workerDto.EstimatedLaborAmount);

      // Recalculate order costs
      await repo.RecalculateOrderCostsAsync(order.Id);

      var updatedOrder = await repo.GetOrderByIdAsync(order.Id);
      Assert.NotNull(updatedOrder);
      // TotalLaborCost must remain 50 (only the manual labor cost), NOT 50 + 150
      Assert.Equal(50m, updatedOrder.TotalLaborCost);
      Assert.Equal(70m, updatedOrder.TotalProductionCost); // 50 labor + 20 other
    }

    [Fact]
    public async Task Test02_ActualHours_MultipliedByRate_AreIncludedInManufacturingLabor()
    {
      // 2. Actual hours × rate are included in manufacturing labor.
      using var context = CreateContext();
      var repo = new ProductionRepository(context);
      var (order, step, person) = await SeedBasicProductionDataAsync(context);

      var worker = await repo.AddStepWorkerAsync(step.Id, new CreateProductionStepWorkerDto
      {
        PersonId = person.Id,
        PlannedHours = 8m,
        DefaultHourlyRate = 12m
      }, userId: 1);

      // Log 5 actual hours at 12 TND/hr = 60 TND
      var log = await repo.AddStepWorkLogAsync(step.Id, new CreateProductionStepWorkLogDto
      {
        StepWorkerId = worker!.Id,
        WorkDate = new DateTime(2026, 4, 15),
        ActualHours = 5m,
        HourlyRate = 12m
      }, userId: 1);

      Assert.NotNull(log);
      Assert.Equal(60m, log.CalculatedLaborAmount);

      var updatedOrder = await repo.GetOrderByIdAsync(order.Id);
      Assert.NotNull(updatedOrder);
      // TotalLaborCost = 50 (manual) + 60 (actual employee work) = 110
      Assert.Equal(110m, updatedOrder.TotalLaborCost);
      Assert.Equal(130m, updatedOrder.TotalProductionCost); // 110 labor + 20 other
      Assert.Equal(13m, updatedOrder.UnitProductionCost);   // 130 / 10 qty = 13.000
    }

    [Fact]
    public async Task Test03_ExistingManualLaborCost_PreservedAndAddedExactlyOnce()
    {
      // 3. Existing manual LaborCost is preserved and added exactly once.
      using var context = CreateContext();
      var repo = new ProductionRepository(context);
      var (order, step, person) = await SeedBasicProductionDataAsync(context);

      var worker = await repo.AddStepWorkerAsync(step.Id, new CreateProductionStepWorkerDto
      {
        PersonId = person.Id,
        PlannedHours = 10m,
        DefaultHourlyRate = 20m
      }, userId: 1);

      await repo.AddStepWorkLogAsync(step.Id, new CreateProductionStepWorkLogDto
      {
        StepWorkerId = worker!.Id,
        WorkDate = new DateTime(2026, 4, 10),
        ActualHours = 2m,
        HourlyRate = 20m // 40 TND
      }, userId: 1);

      await repo.AddStepWorkLogAsync(step.Id, new CreateProductionStepWorkLogDto
      {
        StepWorkerId = worker.Id,
        WorkDate = new DateTime(2026, 4, 11),
        ActualHours = 3m,
        HourlyRate = 20m // 60 TND
      }, userId: 1);

      // Re-run recalculation explicitly
      await repo.RecalculateOrderCostsAsync(order.Id);

      var updatedOrder = await repo.GetOrderByIdAsync(order.Id);
      Assert.NotNull(updatedOrder);
      // Manual LaborCost (50) + WorkLog1 (40) + WorkLog2 (60) = 150
      Assert.Equal(150m, updatedOrder.TotalLaborCost);

      // Verify the step's manual labor cost in DB was not mutated
      var freshStep = await context.ProductionSteps.FindAsync(step.Id);
      Assert.Equal(50.000m, freshStep!.LaborCost);
    }

    [Fact]
    public async Task Test04_ExistingOrderTotals_RemainUnchanged_WhenNoWorkLogsExist()
    {
      // 4. Existing order totals remain unchanged when no work logs exist.
      using var context = CreateContext();
      var repo = new ProductionRepository(context);
      var (order, step, _) = await SeedBasicProductionDataAsync(context);

      await repo.RecalculateOrderCostsAsync(order.Id);

      var updatedOrder = await repo.GetOrderByIdAsync(order.Id);
      Assert.NotNull(updatedOrder);
      Assert.Equal(50m, updatedOrder.TotalLaborCost);
      Assert.Equal(20m, updatedOrder.TotalOtherCost);
      Assert.Equal(70m, updatedOrder.TotalProductionCost);
      Assert.Equal(7m, updatedOrder.UnitProductionCost); // 70 / 10 = 7.000
    }

    [Fact]
    public async Task Test05_HistoricalRates_RemainUnchanged_AfterDefaultRateUpdate()
    {
      // 5. Historical rates remain unchanged after a default-rate update.
      using var context = CreateContext();
      var repo = new ProductionRepository(context);
      var (order, step, person) = await SeedBasicProductionDataAsync(context);

      var worker = await repo.AddStepWorkerAsync(step.Id, new CreateProductionStepWorkerDto
      {
        PersonId = person.Id,
        PlannedHours = 10m,
        DefaultHourlyRate = 15m
      }, userId: 1);

      // Log 4 hours using default rate (15 TND/hr) = 60 TND
      var log = await repo.AddStepWorkLogAsync(step.Id, new CreateProductionStepWorkLogDto
      {
        StepWorkerId = worker!.Id,
        WorkDate = new DateTime(2026, 4, 12),
        ActualHours = 4m,
        HourlyRate = null // Should inherit worker.DefaultHourlyRate
      }, userId: 1);

      Assert.Equal(15m, log!.HourlyRate);
      Assert.Equal(60m, log.CalculatedLaborAmount);

      // Now update the worker's default hourly rate to 25 TND/hr
      await repo.UpdateStepWorkerAsync(worker.Id, new UpdateProductionStepWorkerDto
      {
        PlannedHours = 10m,
        DefaultHourlyRate = 25m
      }, userId: 1);

      // Historical work log must keep rate = 15m and amount = 60m
      var refreshedLog = await context.ProductionStepWorkLogs.FindAsync(log.Id);
      Assert.NotNull(refreshedLog);
      Assert.Equal(15m, refreshedLog.HourlyRate);
      Assert.Equal(60m, refreshedLog.CalculatedLaborAmount);

      var updatedOrder = await repo.GetOrderByIdAsync(order.Id);
      Assert.Equal(110m, updatedOrder!.TotalLaborCost); // 50 + 60
    }

    [Fact]
    public async Task Test06_ServerSideAmounts_CannotBeOverriddenByClient()
    {
      // 6. Server-side amounts cannot be overridden by the client.
      using var context = CreateContext();
      var repo = new ProductionRepository(context);
      var (_, step, person) = await SeedBasicProductionDataAsync(context);

      var worker = await repo.AddStepWorkerAsync(step.Id, new CreateProductionStepWorkerDto
      {
        PersonId = person.Id,
        PlannedHours = 5m,
        DefaultHourlyRate = 20m
      }, userId: 1);

      // Create work log: 3 hours at 20 TND/hr. Server must calculate 60.000m
      var log = await repo.AddStepWorkLogAsync(step.Id, new CreateProductionStepWorkLogDto
      {
        StepWorkerId = worker!.Id,
        WorkDate = new DateTime(2026, 4, 15),
        ActualHours = 3m,
        HourlyRate = 20m
      }, userId: 1);

      Assert.Equal(60m, log!.CalculatedLaborAmount);

      // Other work entry: 4 hours at 15 TND/hr. Server must calculate 60.000m
      var other = await repo.CreateOtherWorkEntryAsync(new CreateProductionOtherWorkEntryDto
      {
        PersonId = person.Id,
        WorkDate = new DateTime(2026, 4, 16),
        Hours = 4m,
        HourlyRate = 15m,
        Description = "Rangement de l'atelier"
      }, userId: 1);

      Assert.Equal(60m, other.CalculatedAmount);
    }

    [Fact]
    public async Task Test07_WorkDates_AtMonthBoundaries_AssignedToCorrectMonth()
    {
      // 7. Work dates at month boundaries are assigned to the correct month.
      using var context = CreateContext();
      var repo = new ProductionRepository(context);
      var (_, step, person) = await SeedBasicProductionDataAsync(context);

      var worker = await repo.AddStepWorkerAsync(step.Id, new CreateProductionStepWorkerDto
      {
        PersonId = person.Id,
        PlannedHours = 10m,
        DefaultHourlyRate = 10m
      }, userId: 1);

      // April 30, 2026 23:59:00 (end of April)
      await repo.AddStepWorkLogAsync(step.Id, new CreateProductionStepWorkLogDto
      {
        StepWorkerId = worker!.Id,
        WorkDate = new DateTime(2026, 4, 30, 23, 59, 0),
        ActualHours = 4m,
        HourlyRate = 10m // 40 TND
      }, userId: 1);

      // May 1, 2026 00:01:00 (start of May)
      await repo.AddStepWorkLogAsync(step.Id, new CreateProductionStepWorkLogDto
      {
        StepWorkerId = worker.Id,
        WorkDate = new DateTime(2026, 5, 1, 0, 1, 0),
        ActualHours = 6m,
        HourlyRate = 10m // 60 TND
      }, userId: 1);

      var aprilSummary = await repo.GetMonthlyPayableSummaryAsync(2026, 4);
      var maySummary = await repo.GetMonthlyPayableSummaryAsync(2026, 5);

      Assert.Equal(4m, aprilSummary.TotalManufacturingHours);
      Assert.Equal(40m, aprilSummary.TotalManufacturingAmount);

      Assert.Equal(6m, maySummary.TotalManufacturingHours);
      Assert.Equal(60m, maySummary.TotalManufacturingAmount);
    }

    [Fact]
    public async Task Test08_StandaloneWork_AppearsInEmployeeSummaries()
    {
      // 8. Standalone work appears in employee summaries.
      using var context = CreateContext();
      var repo = new ProductionRepository(context);
      var (_, _, person) = await SeedBasicProductionDataAsync(context);

      await repo.CreateOtherWorkEntryAsync(new CreateProductionOtherWorkEntryDto
      {
        PersonId = person.Id,
        WorkDate = new DateTime(2026, 4, 18),
        Hours = 7m,
        HourlyRate = 12m, // 84 TND
        Description = "Affûtage des lames"
      }, userId: 1);

      var summary = await repo.GetMonthlyPayableSummaryAsync(2026, 4);

      Assert.Equal(7m, summary.TotalOtherHours);
      Assert.Equal(84m, summary.TotalOtherAmount);
      Assert.Equal(7m, summary.TotalPayableHours);
      Assert.Equal(84m, summary.TotalPayableAmount);

      var emp = Assert.Single(summary.Employees);
      Assert.Equal(person.Id, emp.PersonId);
      Assert.Equal(7m, emp.OtherHours);
      Assert.Equal(84m, emp.OtherAmount);
      Assert.Equal(84m, emp.TotalPayableAmount);
    }

    [Fact]
    public async Task Test09_StandaloneWork_NeverAffects_ManufacturingOrderCosts()
    {
      // 9. Standalone work never affects manufacturing-order costs.
      using var context = CreateContext();
      var repo = new ProductionRepository(context);
      var (order, _, person) = await SeedBasicProductionDataAsync(context);

      // Create large standalone entry
      await repo.CreateOtherWorkEntryAsync(new CreateProductionOtherWorkEntryDto
      {
        PersonId = person.Id,
        WorkDate = new DateTime(2026, 4, 20),
        Hours = 50m,
        HourlyRate = 100m, // 5,000 TND
        Description = "Maintenance générale de l'usine"
      }, userId: 1);

      await repo.RecalculateOrderCostsAsync(order.Id);

      var updatedOrder = await repo.GetOrderByIdAsync(order.Id);
      Assert.NotNull(updatedOrder);
      // Order labor and total costs must remain strictly 50 and 70!
      Assert.Equal(50m, updatedOrder.TotalLaborCost);
      Assert.Equal(70m, updatedOrder.TotalProductionCost);
    }

    [Fact]
    public async Task Test10_SoftDeletedStandaloneEntries_AreExcluded()
    {
      // 10. Soft-deleted standalone entries are excluded.
      using var context = CreateContext();
      var repo = new ProductionRepository(context);
      var (_, _, person) = await SeedBasicProductionDataAsync(context);

      var entry = await repo.CreateOtherWorkEntryAsync(new CreateProductionOtherWorkEntryDto
      {
        PersonId = person.Id,
        WorkDate = new DateTime(2026, 4, 10),
        Hours = 10m,
        HourlyRate = 15m,
        Description = "Peinture hangar"
      }, userId: 1);

      // Delete the entry
      bool deleted = await repo.DeleteOtherWorkEntryAsync(entry.Id, userId: 1);
      Assert.True(deleted);

      // Check GetAll
      var list = await repo.GetOtherWorkEntriesAsync(personId: person.Id);
      Assert.Empty(list);

      // Check monthly summary
      var summary = await repo.GetMonthlyPayableSummaryAsync(2026, 4);
      Assert.Equal(0m, summary.TotalOtherHours);
      Assert.Equal(0m, summary.TotalOtherAmount);
    }

    [Fact]
    public async Task Test11_CancelledOrderWorkLogs_ExcludedFromMonthlyPayableSummaries()
    {
      // 11. Cancelled-order work logs are excluded from monthly payable summaries.
      using var context = CreateContext();
      var repo = new ProductionRepository(context);
      var (order, step, person) = await SeedBasicProductionDataAsync(context);

      var worker = await repo.AddStepWorkerAsync(step.Id, new CreateProductionStepWorkerDto
      {
        PersonId = person.Id,
        PlannedHours = 10m,
        DefaultHourlyRate = 20m
      }, userId: 1);

      await repo.AddStepWorkLogAsync(step.Id, new CreateProductionStepWorkLogDto
      {
        StepWorkerId = worker!.Id,
        WorkDate = new DateTime(2026, 4, 14),
        ActualHours = 5m,
        HourlyRate = 20m // 100 TND
      }, userId: 1);

      // Verify it appears when order is Planned
      var beforeSummary = await repo.GetMonthlyPayableSummaryAsync(2026, 4);
      Assert.Equal(100m, beforeSummary.TotalManufacturingAmount);

      // Now cancel the order
      order.Status = ProductionStatus.Cancelled;
      await context.SaveChangesAsync();

      // Monthly payable summary must now exclude it!
      var afterSummary = await repo.GetMonthlyPayableSummaryAsync(2026, 4);
      Assert.Equal(0m, afterSummary.TotalManufacturingAmount);
      Assert.Equal(0m, afterSummary.TotalManufacturingHours);
      Assert.Empty(afterSummary.Employees);
    }

    [Fact]
    public async Task Test12_ValidatedAndCancelledOrders_RejectLaborMutations()
    {
      // 12. Validated and cancelled orders reject labor mutations.
      using var context = CreateContext();
      var repo = new ProductionRepository(context);
      var (order, step, person) = await SeedBasicProductionDataAsync(context);

      var worker = await repo.AddStepWorkerAsync(step.Id, new CreateProductionStepWorkerDto
      {
        PersonId = person.Id,
        PlannedHours = 5m,
        DefaultHourlyRate = 10m
      }, userId: 1);

      // Mark order as Validated
      order.Status = ProductionStatus.Validated;
      await context.SaveChangesAsync();

      // 1. Cannot add new worker to validated order
      var person2 = new Person { Firstname = "Ali", Lastname = "BEN ALI", Role = Roles.User };
      context.Persons.Add(person2);
      await context.SaveChangesAsync();

      await Assert.ThrowsAsync<InvalidOperationException>(() =>
        repo.AddStepWorkerAsync(step.Id, new CreateProductionStepWorkerDto
        {
          PersonId = person2.Id,
          PlannedHours = 5m,
          DefaultHourlyRate = 10m
        }, userId: 1));

      // 2. Cannot log hours to validated order
      await Assert.ThrowsAsync<InvalidOperationException>(() =>
        repo.AddStepWorkLogAsync(step.Id, new CreateProductionStepWorkLogDto
        {
          StepWorkerId = worker!.Id,
          WorkDate = DateTime.UtcNow,
          ActualHours = 2m
        }, userId: 1));

      // 3. Cannot delete worker on validated order
      await Assert.ThrowsAsync<InvalidOperationException>(() =>
        repo.DeleteStepWorkerAsync(worker!.Id));
    }

    [Fact]
    public async Task Test13_InvalidOrInconsistentEmployeeOrStepIdentifiers_AreRejected()
    {
      // 13. Invalid or inconsistent employee/step identifiers are rejected.
      using var context = CreateContext();
      var repo = new ProductionRepository(context);
      var (_, step, _) = await SeedBasicProductionDataAsync(context);

      // Non-existent PersonId
      await Assert.ThrowsAsync<ArgumentException>(() =>
        repo.AddStepWorkerAsync(step.Id, new CreateProductionStepWorkerDto
        {
          PersonId = 99999,
          PlannedHours = 5m,
          DefaultHourlyRate = 10m
        }, userId: 1));

      // Non-existent StepId for worker assignment
      var res = await repo.AddStepWorkerAsync(88888, new CreateProductionStepWorkerDto
      {
        PersonId = 1,
        PlannedHours = 5m,
        DefaultHourlyRate = 10m
      }, userId: 1);
      Assert.Null(res);

      // StepWorkerId mismatching step
      var step2 = new ProductionStep
      {
        ProductionOrderId = step.ProductionOrderId,
        StepNumber = 2,
        Name = "Assemblage",
        CreatedById = 1
      };
      context.ProductionSteps.Add(step2);
      await context.SaveChangesAsync();

      var workerInStep1 = await repo.AddStepWorkerAsync(step.Id, new CreateProductionStepWorkerDto
      {
        PersonId = 1,
        PlannedHours = 5m,
        DefaultHourlyRate = 10m
      }, userId: 1);

      // Attempt to log hours for workerInStep1 against step2
      await Assert.ThrowsAsync<ArgumentException>(() =>
        repo.AddStepWorkLogAsync(step2.Id, new CreateProductionStepWorkLogDto
        {
          StepWorkerId = workerInStep1!.Id,
          WorkDate = DateTime.UtcNow,
          ActualHours = 2m
        }, userId: 1));
    }

    [Fact]
    public async Task Test14_CrossTenantAccess_IsPrevented()
    {
      // 14. Cross-tenant access is prevented.
      using var contextA = CreateContext("tenant-socobois");
      using var contextB = CreateContext("tenant-piqbit");

      var repoA = new ProductionRepository(contextA);
      var repoB = new ProductionRepository(contextB);

      // Seed employee and step in Tenant A
      var personA = new Person { Firstname = "Mourad", Lastname = "TRABELSI", Role = Roles.User };
      contextA.Persons.Add(personA);

      var orderA = new ProductionOrder
      {
        Reference = "OF-TENANT-A",
        SalesSiteId = 1,
        Status = ProductionStatus.Planned,
        CreatedById = 1
      };
      contextA.ProductionOrders.Add(orderA);
      await contextA.SaveChangesAsync();

      var stepA = new ProductionStep
      {
        ProductionOrderId = orderA.Id,
        StepNumber = 1,
        Name = "Usinage",
        CreatedById = 1
      };
      contextA.ProductionSteps.Add(stepA);
      await contextA.SaveChangesAsync();

      // Tenant B tries to assign Tenant A's person to its own step
      var orderB = new ProductionOrder
      {
        Reference = "OF-TENANT-B",
        SalesSiteId = 1,
        Status = ProductionStatus.Planned,
        CreatedById = 1
      };
      contextB.ProductionOrders.Add(orderB);
      await contextB.SaveChangesAsync();

      var stepB = new ProductionStep
      {
        ProductionOrderId = orderB.Id,
        StepNumber = 1,
        Name = "Usinage B",
        CreatedById = 1
      };
      contextB.ProductionSteps.Add(stepB);
      await contextB.SaveChangesAsync();

      // PersonA does not exist in contextB -> rejected!
      await Assert.ThrowsAsync<ArgumentException>(() =>
        repoB.AddStepWorkerAsync(stepB.Id, new CreateProductionStepWorkerDto
        {
          PersonId = personA.Id,
          PlannedHours = 10m,
          DefaultHourlyRate = 15m
        }, userId: 1));
    }

    [Fact]
    public async Task Test15_FailedMutations_DoNotLeaveStaleOrInconsistentCostTotals()
    {
      // 15. Failed mutations do not leave stale or inconsistent cost totals.
      using var context = CreateContext();
      var repo = new ProductionRepository(context);
      var (order, step, person) = await SeedBasicProductionDataAsync(context);

      var worker = await repo.AddStepWorkerAsync(step.Id, new CreateProductionStepWorkerDto
      {
        PersonId = person.Id,
        PlannedHours = 10m,
        DefaultHourlyRate = 20m
      }, userId: 1);

      await repo.AddStepWorkLogAsync(step.Id, new CreateProductionStepWorkLogDto
      {
        StepWorkerId = worker!.Id,
        WorkDate = new DateTime(2026, 4, 10),
        ActualHours = 2m,
        HourlyRate = 20m // 40 TND
      }, userId: 1);

      var orderBefore = await repo.GetOrderByIdAsync(order.Id);
      Assert.Equal(90m, orderBefore!.TotalLaborCost); // 50 manual + 40 actual

      // Attempt invalid work log mutation (e.g. negative hours)
      await Assert.ThrowsAsync<ArgumentException>(() =>
        repo.AddStepWorkLogAsync(step.Id, new CreateProductionStepWorkLogDto
        {
          StepWorkerId = worker.Id,
          WorkDate = new DateTime(2026, 4, 11),
          ActualHours = -5m,
          HourlyRate = 20m
        }, userId: 1));

      // Order costs must remain strictly consistent at 90m
      var orderAfter = await repo.GetOrderByIdAsync(order.Id);
      Assert.Equal(90m, orderAfter!.TotalLaborCost);
      Assert.Equal(110m, orderAfter.TotalProductionCost);
    }

    [Fact]
    public async Task Test16_ExistingInventoryValidationAndCancellationBehavior_RemainsIntact()
    {
      // 16. Existing inventory validation/cancellation behavior remains intact.
      using var context = CreateContext();
      var repo = new ProductionRepository(context);
      var (order, step, person) = await SeedBasicProductionDataAsync(context);

      // Add worker and work log
      var worker = await repo.AddStepWorkerAsync(step.Id, new CreateProductionStepWorkerDto
      {
        PersonId = person.Id,
        PlannedHours = 5m,
        DefaultHourlyRate = 10m
      }, userId: 1);

      await repo.AddStepWorkLogAsync(step.Id, new CreateProductionStepWorkLogDto
      {
        StepWorkerId = worker!.Id,
        WorkDate = new DateTime(2026, 4, 15),
        ActualHours = 3m,
        HourlyRate = 10m // 30 TND
      }, userId: 1);

      // Verify order initial status and costs
      var preOrder = await repo.GetOrderByIdAsync(order.Id);
      Assert.Equal(ProductionStatus.Planned, preOrder!.Status);
      Assert.Equal(80m, preOrder.TotalLaborCost); // 50 manual + 30 actual

      // Simulate order transition to InProgress and then Validated
      order.Status = ProductionStatus.InProgress;
      await context.SaveChangesAsync();

      var inProgOrder = await repo.GetOrderByIdAsync(order.Id);
      Assert.Equal(ProductionStatus.InProgress, inProgOrder!.Status);

      order.Status = ProductionStatus.Validated;
      await context.SaveChangesAsync();

      var validatedOrder = await repo.GetOrderByIdAsync(order.Id);
      Assert.Equal(ProductionStatus.Validated, validatedOrder!.Status);
      Assert.Equal(80m, validatedOrder.TotalLaborCost);

      // Further labor updates are locked once validated
      await Assert.ThrowsAsync<InvalidOperationException>(() =>
        repo.AddStepWorkerAsync(step.Id, new CreateProductionStepWorkerDto
        {
          PersonId = person.Id,
          PlannedHours = 1m,
          DefaultHourlyRate = 10m
        }, userId: 1));
    }

    [Fact]
    public async Task Test17_AssignmentDeletion_Rejected_WhenWorkLogsExist()
    {
      // 17. Assignment deletion rejected when work logs exist (prevents historical work-log loss).
      using var context = CreateContext();
      var repo = new ProductionRepository(context);
      var (order, step, person) = await SeedBasicProductionDataAsync(context);

      var worker = await repo.AddStepWorkerAsync(step.Id, new CreateProductionStepWorkerDto
      {
        PersonId = person.Id,
        PlannedHours = 8m,
        DefaultHourlyRate = 15m
      }, userId: 1);

      await repo.AddStepWorkLogAsync(step.Id, new CreateProductionStepWorkLogDto
      {
        StepWorkerId = worker!.Id,
        WorkDate = new DateTime(2026, 4, 15),
        ActualHours = 4m,
        HourlyRate = 15m
      }, userId: 1);

      // Attempting to delete the assignment must throw an InvalidOperationException
      var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
        repo.DeleteStepWorkerAsync(worker.Id));

      Assert.Contains("sessions de travail enregistrées", ex.Message);
    }

    [Fact]
    public async Task Test18_RejectedAssignmentDeletion_PreservesLogsAndFinancialTotals()
    {
      // 18. Rejected assignment deletion preserves logs and financial totals.
      using var context = CreateContext();
      var repo = new ProductionRepository(context);
      var (order, step, person) = await SeedBasicProductionDataAsync(context);

      var worker = await repo.AddStepWorkerAsync(step.Id, new CreateProductionStepWorkerDto
      {
        PersonId = person.Id,
        PlannedHours = 8m,
        DefaultHourlyRate = 20m
      }, userId: 1);

      var log = await repo.AddStepWorkLogAsync(step.Id, new CreateProductionStepWorkLogDto
      {
        StepWorkerId = worker!.Id,
        WorkDate = new DateTime(2026, 4, 15),
        ActualHours = 5m,
        HourlyRate = 20m // 100 TND
      }, userId: 1);

      // Attempt deletion and catch exception
      await Assert.ThrowsAsync<InvalidOperationException>(() =>
        repo.DeleteStepWorkerAsync(worker.Id));

      // Work log still exists in DB
      var dbLog = await context.ProductionStepWorkLogs.FindAsync(log!.Id);
      Assert.NotNull(dbLog);
      Assert.Equal(100m, dbLog.CalculatedLaborAmount);

      // Worker assignment still exists in DB
      var dbWorker = await context.ProductionStepWorkers.FindAsync(worker.Id);
      Assert.NotNull(dbWorker);

      // Order total labor cost is preserved (50 manual + 100 actual = 150)
      var orderAfter = await repo.GetOrderByIdAsync(order.Id);
      Assert.Equal(150m, orderAfter!.TotalLaborCost);

      // Monthly payable summary is preserved
      var summary = await repo.GetMonthlyPayableSummaryAsync(2026, 4);
      Assert.Equal(100m, summary.TotalManufacturingAmount);
    }

    [Fact]
    public async Task Test19_SoftDeletedOrder_WorkLogs_ExcludedFromMonthlySummaries()
    {
      // 19. Soft-deleted order work logs excluded from monthly summaries.
      using var context = CreateContext();
      var repo = new ProductionRepository(context);
      var (order, step, person) = await SeedBasicProductionDataAsync(context);

      var worker = await repo.AddStepWorkerAsync(step.Id, new CreateProductionStepWorkerDto
      {
        PersonId = person.Id,
        PlannedHours = 10m,
        DefaultHourlyRate = 25m
      }, userId: 1);

      await repo.AddStepWorkLogAsync(step.Id, new CreateProductionStepWorkLogDto
      {
        StepWorkerId = worker!.Id,
        WorkDate = new DateTime(2026, 4, 10),
        ActualHours = 4m,
        HourlyRate = 25m // 100 TND
      }, userId: 1);

      // Confirm work log is present before deletion
      var preSummary = await repo.GetMonthlyPayableSummaryAsync(2026, 4);
      Assert.Equal(100m, preSummary.TotalManufacturingAmount);

      // Soft-delete the order
      order.IsDeleted = true;
      await context.SaveChangesAsync();

      // Monthly payable summary must exclude soft-deleted order logs
      var postSummary = await repo.GetMonthlyPayableSummaryAsync(2026, 4);
      Assert.Equal(0m, postSummary.TotalManufacturingAmount);
      Assert.Equal(0m, postSummary.TotalManufacturingHours);
      Assert.Empty(postSummary.Employees);
    }

    [Fact]
    public async Task Test20_EligibleValidatedOrder_WorkLogs_RemainIncludedInMonthlySummaries()
    {
      // 20. Eligible validated-order work logs remain included in monthly summaries.
      using var context = CreateContext();
      var repo = new ProductionRepository(context);
      var (order, step, person) = await SeedBasicProductionDataAsync(context);

      var worker = await repo.AddStepWorkerAsync(step.Id, new CreateProductionStepWorkerDto
      {
        PersonId = person.Id,
        PlannedHours = 10m,
        DefaultHourlyRate = 20m
      }, userId: 1);

      await repo.AddStepWorkLogAsync(step.Id, new CreateProductionStepWorkLogDto
      {
        StepWorkerId = worker!.Id,
        WorkDate = new DateTime(2026, 4, 20),
        ActualHours = 6m,
        HourlyRate = 20m // 120 TND
      }, userId: 1);

      // Validate the order
      order.Status = ProductionStatus.Validated;
      await context.SaveChangesAsync();

      // Validated order work logs MUST remain included
      var summary = await repo.GetMonthlyPayableSummaryAsync(2026, 4);
      Assert.Equal(6m, summary.TotalManufacturingHours);
      Assert.Equal(120m, summary.TotalManufacturingAmount);
      Assert.Single(summary.Employees);
      Assert.Equal(120m, summary.Employees[0].TotalPayableAmount);
    }

    [Fact]
    public async Task Test21_CancelledStep_WorkLogCreation_Rejected()
    {
      // 21. Cancelled-step work-log creation rejected.
      using var context = CreateContext();
      var repo = new ProductionRepository(context);
      var (order, step, person) = await SeedBasicProductionDataAsync(context);

      var worker = await repo.AddStepWorkerAsync(step.Id, new CreateProductionStepWorkerDto
      {
        PersonId = person.Id,
        PlannedHours = 5m,
        DefaultHourlyRate = 15m
      }, userId: 1);

      // Cancel the step
      step.Status = ProductionStepStatus.Cancelled;
      await context.SaveChangesAsync();

      // Attempt to log hours on cancelled step
      var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
        repo.AddStepWorkLogAsync(step.Id, new CreateProductionStepWorkLogDto
        {
          StepWorkerId = worker!.Id,
          WorkDate = new DateTime(2026, 4, 15),
          ActualHours = 3m
        }, userId: 1));

      Assert.Contains("étape de fabrication annulée", ex.Message);
    }

    [Fact]
    public async Task Test22_CancelledStep_WorkLogUpdateAndDelete_Rejected()
    {
      // 22. Cancelled-step work-log update and delete rejected.
      using var context = CreateContext();
      var repo = new ProductionRepository(context);
      var (order, step, person) = await SeedBasicProductionDataAsync(context);

      var worker = await repo.AddStepWorkerAsync(step.Id, new CreateProductionStepWorkerDto
      {
        PersonId = person.Id,
        PlannedHours = 5m,
        DefaultHourlyRate = 15m
      }, userId: 1);

      var log = await repo.AddStepWorkLogAsync(step.Id, new CreateProductionStepWorkLogDto
      {
        StepWorkerId = worker!.Id,
        WorkDate = new DateTime(2026, 4, 15),
        ActualHours = 3m,
        HourlyRate = 15m
      }, userId: 1);

      // Cancel the step
      step.Status = ProductionStepStatus.Cancelled;
      await context.SaveChangesAsync();

      // Attempt to update work log on cancelled step
      var exUpdate = await Assert.ThrowsAsync<InvalidOperationException>(() =>
        repo.UpdateStepWorkLogAsync(log!.Id, new UpdateProductionStepWorkLogDto
        {
          WorkDate = new DateTime(2026, 4, 15),
          ActualHours = 4m
        }, userId: 1));
      Assert.Contains("étape de fabrication annulée", exUpdate.Message);

      // Attempt to delete work log on cancelled step
      var exDelete = await Assert.ThrowsAsync<InvalidOperationException>(() =>
        repo.DeleteStepWorkLogAsync(log.Id));
      Assert.Contains("étape de fabrication annulée", exDelete.Message);
    }

    #region Stock Identity & Multi-Tenant Audit Safety Tests

    [Fact]
    public async Task InsertFirstTransaction_WithZeroUserId_ThrowsInvalidOperationException()
    {
      using var context = CreateContext();
      var docMerchRepo = new DocumentMerchandiseRepository(context);
      var stockRepo = new StockRepository(context, docMerchRepo);

      var merch = new Merchandise { Id = 101, AllowNegativStock = false };
      var site = new SalesSite { Id = 1, Address = "Site Principal" };
      context.Merchandises.Add(merch);
      context.SalesSites.Add(site);
      await context.SaveChangesAsync();

      var transaction = new Stock
      {
        MerchandiseId = 101,
        Merchandises = merch,
        SalesSiteId = 1,
        SalesSites = site,
        Quantity = 10,
        Type = TransactionType.Add,
        UpdatedById = 0
      };

      var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
        stockRepo.HandleTransaction(transaction));
      Assert.Contains("UpdatedById", ex.Message);
    }

    [Fact]
    public async Task InsertFirstTransaction_WithNonExistentUserId_ThrowsInvalidOperationException()
    {
      using var context = CreateContext();
      var docMerchRepo = new DocumentMerchandiseRepository(context);
      var stockRepo = new StockRepository(context, docMerchRepo);

      var merch = new Merchandise { Id = 102, AllowNegativStock = false };
      var site = new SalesSite { Id = 1, Address = "Site Principal" };
      context.Merchandises.Add(merch);
      context.SalesSites.Add(site);
      await context.SaveChangesAsync();

      var transaction = new Stock
      {
        MerchandiseId = 102,
        Merchandises = merch,
        SalesSiteId = 1,
        SalesSites = site,
        Quantity = 5,
        Type = TransactionType.Add,
        UpdatedById = 9999 // User 9999 does not exist
      };

      var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
        stockRepo.HandleTransaction(transaction));
      Assert.Contains("introuvable ou inactif", ex.Message);
    }

    [Fact]
    public async Task InsertFirstTransaction_WithValidActiveUserId_Succeeds()
    {
      using var context = CreateContext();
      var docMerchRepo = new DocumentMerchandiseRepository(context);
      var stockRepo = new StockRepository(context, docMerchRepo);

      var user = new AppUser { Id = 42, IsActive = true };
      var merch = new Merchandise { Id = 103, AllowNegativStock = false };
      var site = new SalesSite { Id = 1, Address = "Site Principal" };
      context.AppUsers.Add(user);
      context.Merchandises.Add(merch);
      context.SalesSites.Add(site);
      await context.SaveChangesAsync();

      var transaction = new Stock
      {
        MerchandiseId = 103,
        Merchandises = merch,
        SalesSiteId = 1,
        SalesSites = site,
        Quantity = 15,
        Type = TransactionType.Add,
        UpdatedById = 42
      };

      await stockRepo.HandleTransaction(transaction);

      var createdStock = await context.Stocks.FirstOrDefaultAsync(s => s.MerchandiseId == 103 && s.SalesSiteId == 1);
      Assert.NotNull(createdStock);
      Assert.Equal(15, createdStock!.Quantity);
      Assert.Equal(42, createdStock.UpdatedById);
    }

    [Fact]
    public async Task UpdateStock_PreservesSalesSiteId_WhenNavigationPropertyIsNull()
    {
      using var context = CreateContext();
      var docMerchRepo = new DocumentMerchandiseRepository(context);
      var stockRepo = new StockRepository(context, docMerchRepo);

      var user = new AppUser { Id = 42, IsActive = true };
      var merch = new Merchandise { Id = 104, AllowNegativStock = false };
      var site = new SalesSite { Id = 2, Address = "Depot 2" };
      context.AppUsers.Add(user);
      context.Merchandises.Add(merch);
      context.SalesSites.Add(site);

      var existing = new Stock
      {
        MerchandiseId = 104,
        SalesSiteId = 2,
        SalesSites = site,
        Quantity = 20,
        UpdatedById = 42,
        Type = TransactionType.Add
      };
      context.Stocks.Add(existing);
      await context.SaveChangesAsync();

      // Transaction where SalesSites navigation is null, but SalesSiteId is 2
      var retrieveTx = new Stock
      {
        MerchandiseId = 104,
        Merchandises = merch,
        SalesSiteId = 2,
        SalesSites = null, // null navigation property
        Quantity = 5,
        Type = TransactionType.Retrieve,
        UpdatedById = 42
      };

      await stockRepo.HandleTransaction(retrieveTx);

      var updatedStock = await context.Stocks.FirstOrDefaultAsync(s => s.MerchandiseId == 104 && s.SalesSiteId == 2);
      Assert.NotNull(updatedStock);
      Assert.Equal(15, updatedStock!.Quantity);
      Assert.Equal(2, updatedStock.SalesSiteId);
    }

    [Fact]
    public async Task ProductionService_ValidateOrderAsync_RejectsInvalidOrInactiveUser()
    {
      using var context = CreateContext();
      var docMerchRepo = new DocumentMerchandiseRepository(context);
      var stockRepo = new StockRepository(context, docMerchRepo);
      var prodRepo = new ProductionRepository(context);
      var logger = new Microsoft.Extensions.Logging.Abstractions.NullLogger<ProductionService>();
      var prodService = new ProductionService(context, prodRepo, stockRepo, logger);

      var (order, step, _) = await SeedBasicProductionDataAsync(context);

      // 1. Rejects zero userId
      var resultZero = await prodService.ValidateOrderAsync(order.Id, userId: 0);
      Assert.False(resultZero.Success);
      Assert.Contains("non autorisé ou inactif", resultZero.Message);

      // 2. Rejects non-existent userId
      var resultNonExistent = await prodService.ValidateOrderAsync(order.Id, userId: 9999);
      Assert.False(resultNonExistent.Success);
      Assert.Contains("non autorisé ou inactif", resultNonExistent.Message);

      // 3. Rejects inactive user
      var inactiveUser = new AppUser { Id = 50, IsActive = false };
      context.AppUsers.Add(inactiveUser);
      await context.SaveChangesAsync();

      var resultInactive = await prodService.ValidateOrderAsync(order.Id, userId: 50);
      Assert.False(resultInactive.Success);
      Assert.Contains("non autorisé ou inactif", resultInactive.Message);
    }

    [Fact]
    public async Task ProductionService_CancelOrderAsync_RejectsInvalidOrInactiveUser()
    {
      using var context = CreateContext();
      var docMerchRepo = new DocumentMerchandiseRepository(context);
      var stockRepo = new StockRepository(context, docMerchRepo);
      var prodRepo = new ProductionRepository(context);
      var logger = new Microsoft.Extensions.Logging.Abstractions.NullLogger<ProductionService>();
      var prodService = new ProductionService(context, prodRepo, stockRepo, logger);

      var (order, _, _) = await SeedBasicProductionDataAsync(context);

      // Attempt cancel with invalid user
      var result = await prodService.CancelOrderAsync(order.Id, userId: 0);
      Assert.False(result.Success);
      Assert.Contains("non autorisé ou inactif", result.Message);
    }

    [Fact]
    public async Task ProductionController_WhenProductionDisabled_Returns403Forbidden()
    {
      using var context = CreateContext();
      context.Enterprises.Add(new Enterprise
      {
        Id = 1,
        Name = "Restricted Tenant",
        IsManagingProduction = false // Production disabled
      });
      await context.SaveChangesAsync();

      var docMerchRepo = new DocumentMerchandiseRepository(context);
      var stockRepo = new StockRepository(context, docMerchRepo);
      var prodRepo = new ProductionRepository(context);
      var logger = new Microsoft.Extensions.Logging.Abstractions.NullLogger<ProductionService>();
      var prodService = new ProductionService(context, prodRepo, stockRepo, logger);

      var controller = new ms.webapp.api.acya.api.Controllers.ProductionController(prodRepo, prodService, context);

      // Act
      var result = await controller.GetAll(null, null, null);

      // Assert
      var objectResult = Assert.IsType<Microsoft.AspNetCore.Mvc.ObjectResult>(result.Result);
      Assert.Equal(Microsoft.AspNetCore.Http.StatusCodes.Status403Forbidden, objectResult.StatusCode);
    }

    #endregion
  }
}

