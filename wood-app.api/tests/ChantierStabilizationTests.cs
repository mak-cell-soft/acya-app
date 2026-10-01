using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.common;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.Chantier;
using ms.webapp.api.acya.core.Entities.DTOs.Chantier;
using ms.webapp.api.acya.core.Entities.Product;
using ms.webapp.api.acya.infrastructure;
using ms.webapp.api.acya.infrastructure.Repositories;
using Xunit;

namespace ms.webapp.api.acya.tests
{
    public class ChantierStabilizationTests
    {
        private readonly WoodAppContext _context;
        private readonly ChantierRepository _repository;

        public ChantierStabilizationTests()
        {
            var options = new DbContextOptionsBuilder<WoodAppContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .ConfigureWarnings(x => x.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
                .Options;

            _context = new WoodAppContext(options);
            _repository = new ChantierRepository(_context);
        }

        [Fact]
        public async Task RecalculateProgress_FourTasksOneDone_ShouldBe25PercentForChantierAnd50PercentForPhase()
        {
            // Arrange: 1 Chantier, 2 Phases, each with 2 Tasks
            var chantier = new Chantier
            {
                Name = "Résidence Carthage",
                Reference = "CH-001",
                StartDate = DateTime.UtcNow,
                CreatedById = 1,
                Status = ChantierStatus.InProgress,
            };
            _context.Chantiers.Add(chantier);
            await _context.SaveChangesAsync();

            var phaseA = new ChantierPhase
            {
                ChantierId = chantier.Id,
                Name = "Phase A - Gros Œuvre",
                SortOrder = 1,
                StartDate = DateTime.UtcNow,
            };
            var phaseB = new ChantierPhase
            {
                ChantierId = chantier.Id,
                Name = "Phase B - Finitions",
                SortOrder = 2,
                StartDate = DateTime.UtcNow,
            };
            _context.ChantierPhases.AddRange(phaseA, phaseB);
            await _context.SaveChangesAsync();

            var task1 = new ChantierTask
            {
                PhaseId = phaseA.Id,
                Label = "Fondations",
                Status = ChantierTaskStatus.Planned,
                ProgressPct = 0,
                StartDate = DateTime.UtcNow,
            };
            var task2 = new ChantierTask
            {
                PhaseId = phaseA.Id,
                Label = "Murs porteurs",
                Status = ChantierTaskStatus.Planned,
                ProgressPct = 0,
                StartDate = DateTime.UtcNow,
            };
            var task3 = new ChantierTask
            {
                PhaseId = phaseB.Id,
                Label = "Plomberie",
                Status = ChantierTaskStatus.Planned,
                ProgressPct = 0,
                StartDate = DateTime.UtcNow,
            };
            var task4 = new ChantierTask
            {
                PhaseId = phaseB.Id,
                Label = "Électricité",
                Status = ChantierTaskStatus.Planned,
                ProgressPct = 0,
                StartDate = DateTime.UtcNow,
            };
            _context.ChantierTasks.AddRange(task1, task2, task3, task4);
            await _context.SaveChangesAsync();

            // Act 1: Initial recalculation with 0 tasks completed
            await _repository.RecalculateProgressAsync(chantier.Id);
            var detail = await _repository.GetDetailByIdAsync(chantier.Id);

            Assert.NotNull(detail);
            Assert.Equal(0, detail.ProgressPct);
            var updatedPhaseA = detail.Phases?.FirstOrDefault(p => p.Id == phaseA.Id);
            var updatedPhaseB = detail.Phases?.FirstOrDefault(p => p.Id == phaseB.Id);
            Assert.NotNull(updatedPhaseA);
            Assert.NotNull(updatedPhaseB);
            Assert.Equal(0, updatedPhaseA.ProgressPct);
            Assert.Equal(0, updatedPhaseB.ProgressPct);

            // Act 2: Mark Task 1 as Done (1/2 tasks in Phase A, 1/4 total tasks in Chantier)
            await _repository.UpdateTaskStatusAsync(task1.Id, new UpdateTaskStatusDto
            {
                Status = ChantierTaskStatus.Done,
                ProgressPct = 100
            });

            detail = await _repository.GetDetailByIdAsync(chantier.Id);
            Assert.NotNull(detail);
            updatedPhaseA = detail.Phases?.FirstOrDefault(p => p.Id == phaseA.Id);
            updatedPhaseB = detail.Phases?.FirstOrDefault(p => p.Id == phaseB.Id);
            Assert.NotNull(updatedPhaseA);
            Assert.NotNull(updatedPhaseB);

            // Assert: Phase A = 50%, Phase B = 0%, Chantier = 25% (NOT average of phases)
            Assert.Equal(50, updatedPhaseA.ProgressPct);
            Assert.Equal(0, updatedPhaseB.ProgressPct);
            Assert.Equal(25, detail.ProgressPct);

            // Act 3: Mark all remaining tasks as Done
            await _repository.UpdateTaskStatusAsync(task2.Id, new UpdateTaskStatusDto { Status = ChantierTaskStatus.Done });
            await _repository.UpdateTaskStatusAsync(task3.Id, new UpdateTaskStatusDto { Status = ChantierTaskStatus.Done });
            await _repository.UpdateTaskStatusAsync(task4.Id, new UpdateTaskStatusDto { Status = ChantierTaskStatus.Done });

            detail = await _repository.GetDetailByIdAsync(chantier.Id);
            Assert.NotNull(detail);
            Assert.Equal(100, detail.ProgressPct);
        }

        [Fact]
        public async Task RecalculateProgress_DeletingTask_ShouldRecalculateAuthoritatively()
        {
            // Arrange: 1 Phase, 2 Tasks, 1 Done => 50%
            var chantier = new Chantier
            {
                Name = "Projet Test",
                StartDate = DateTime.UtcNow,
                CreatedById = 1,
            };
            _context.Chantiers.Add(chantier);
            await _context.SaveChangesAsync();

            var phase = new ChantierPhase
            {
                ChantierId = chantier.Id,
                Name = "Phase Unique",
                StartDate = DateTime.UtcNow,
            };
            _context.ChantierPhases.Add(phase);
            await _context.SaveChangesAsync();

            var task1 = new ChantierTask { PhaseId = phase.Id, Label = "T1", Status = ChantierTaskStatus.Done, StartDate = DateTime.UtcNow };
            var task2 = new ChantierTask { PhaseId = phase.Id, Label = "T2", Status = ChantierTaskStatus.Planned, StartDate = DateTime.UtcNow };
            _context.ChantierTasks.AddRange(task1, task2);
            await _context.SaveChangesAsync();

            await _repository.RecalculateProgressAsync(chantier.Id);
            var detail = await _repository.GetDetailByIdAsync(chantier.Id);
            Assert.NotNull(detail);
            Assert.Equal(50, detail.ProgressPct);

            // Act: Delete task 2 (the incomplete one) => only task 1 remains and it is Done
            await _repository.DeleteTaskAsync(task2.Id);

            detail = await _repository.GetDetailByIdAsync(chantier.Id);
            Assert.NotNull(detail);
            Assert.Equal(100, detail.ProgressPct);
        }

        [Fact]
        public async Task ClientRelationship_WithAndWithoutClient_ShouldBeHandledGracefully()
        {
            // Arrange: 1 Client CounterPart
            var client = new CounterPart
            {
                Name = "Société Immobilière Carthage",
                Type = CounterPartType.Customer,
                CreationDate = DateTime.UtcNow,
                IsDeleted = false
            };
            _context.CounterParts.Add(client);
            await _context.SaveChangesAsync();

            // Chantier with client
            var chantierWithClient = new Chantier
            {
                Name = "Chantier A",
                StartDate = DateTime.UtcNow,
                CreatedById = 1,
                ClientCounterPartId = client.Id
            };

            // Chantier without client
            var chantierWithoutClient = new Chantier
            {
                Name = "Chantier B",
                StartDate = DateTime.UtcNow,
                CreatedById = 1,
                ClientCounterPartId = null
            };

            _context.Chantiers.AddRange(chantierWithClient, chantierWithoutClient);
            await _context.SaveChangesAsync();

            // Act
            var detailWithClient = await _repository.GetDetailByIdAsync(chantierWithClient.Id);
            var detailWithoutClient = await _repository.GetDetailByIdAsync(chantierWithoutClient.Id);
            var allList = await _repository.GetAllAsync();

            // Assert
            Assert.NotNull(detailWithClient);
            Assert.Equal(client.Id, detailWithClient.ClientCounterPartId);
            Assert.Equal("Société Immobilière Carthage", detailWithClient.ClientName);

            Assert.NotNull(detailWithoutClient);
            Assert.Null(detailWithoutClient.ClientCounterPartId);
            Assert.Null(detailWithoutClient.ClientName);

            var listItemA = allList.First(c => c.Id == chantierWithClient.Id);
            var listItemB = allList.First(c => c.Id == chantierWithoutClient.Id);
            Assert.Equal("Société Immobilière Carthage", listItemA.ClientName);
            Assert.Null(listItemB.ClientName);
        }

        [Fact]
        public async Task MaterialRequirement_FromCatalogueArticle_DoesNotRequireOrProduceMerchandise()
        {
            // Arrange: Create a catalogue Article (no merchandise exists)
            var article = new Article
            {
                Reference = "CIMENT-42.5",
                Description = "Ciment Portland CEM II 42.5",
                Type = ArticleType.Merchandise,
                SellPriceHT = 18.5,
                CreationDate = DateTime.UtcNow,
                Unit = "Sac 50kg"
            };
            _context.Articles.Add(article);

            var chantier = new Chantier
            {
                Name = "Chantier Matériaux",
                StartDate = DateTime.UtcNow,
                CreatedById = 1,
            };
            _context.Chantiers.Add(chantier);
            await _context.SaveChangesAsync();

            // Act: Declare material requirement referencing ArticleId
            var dto = new CreateMaterialRequirementDto(
                ArticleId: article.Id,
                RequiredQty: 100,
                Unit: "Sac 50kg",
                Category: "Gros Œuvre",
                MaterialType: "Principal",
                MinimumQty: 10
            );

            var req = await _repository.AddMaterialRequirementAsync(chantier.Id, dto);

            // Assert: Requirement is created with Article reference and NO fake merchandise
            Assert.NotNull(req);
            Assert.Equal(article.Id, req.ArticleId);
            Assert.Null(req.MerchandiseId);
            Assert.Equal("CIMENT-42.5", req.MerchandiseRef);
            Assert.Equal("Ciment Portland CEM II 42.5", req.MerchandiseDesignation);
            Assert.Equal(100, req.RequiredQty);
            Assert.Equal(0, req.ConsumedQty);
            Assert.Equal(100, req.RemainingQty);

            // Verify no merchandise was inserted
            Assert.Empty(_context.Merchandises);
        }

        [Fact]
        public async Task PhaseAndUpdateTask_CRUD_ShouldWorkAndRecalculate()
        {
            // Arrange
            var chantier = new Chantier
            {
                Name = "Chantier CRUD",
                StartDate = DateTime.UtcNow,
                CreatedById = 1,
            };
            _context.Chantiers.Add(chantier);
            await _context.SaveChangesAsync();

            // Create Phase
            var phase = await _repository.CreatePhaseAsync(chantier.Id, new CreateChantierPhaseDto(
                Name: "Phase Initiale",
                Color: "#2563eb",
                StartDate: DateTime.UtcNow,
                SortOrder: 1
            ));
            Assert.NotNull(phase);
            Assert.Equal("Phase Initiale", phase.Name);

            // Update Phase
            var updatedPhaseSuccess = await _repository.UpdatePhaseAsync(phase.Id, new UpdateChantierPhaseDto(
                Name: "Phase Rénovée",
                Color: "#10b981",
                SortOrder: 2
            ));
            Assert.True(updatedPhaseSuccess);

            // Create Task
            var task = await _repository.CreateTaskAsync(phase.Id, new CreateChantierTaskDto(
                Label: "Tâche 1",
                SubLabel: "Sous-détail",
                StartDate: DateTime.UtcNow,
                SortOrder: 1
            ));
            Assert.NotNull(task);
            Assert.Equal("Tâche 1", task.Label);

            // Update Task
            var updatedTaskSuccess = await _repository.UpdateTaskAsync(task.Id, new UpdateChantierTaskDto(
                Label: "Tâche 1 Modifiée",
                SubLabel: "Nouveau sous-détail"
            ));
            Assert.True(updatedTaskSuccess);

            // Delete Phase (should cascade soft-delete tasks)
            var deleted = await _repository.DeletePhaseAsync(phase.Id);
            Assert.True(deleted);

            var detail = await _repository.GetDetailByIdAsync(chantier.Id);
            Assert.NotNull(detail);
            Assert.Empty(detail.Phases);
        }
    }
}
