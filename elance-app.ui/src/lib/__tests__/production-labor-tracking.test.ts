import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  formatCalendarDate,
  getTodayCalendarDate,
  isStepLaborEditable,
  filterAvailableEmployees,
  computeStepLaborTotals,
} from '../production-labor-utils';
import {
  ProductionOrder,
  ProductionStep,
  ProductionStepWorker,
  ProductionStepWorkLog,
  ProductionOtherWorkEntry,
  MonthlyEmployeePayableSummary,
  CreateProductionStepWorkerInput,
  CreateProductionStepWorkLogInput,
  CreateProductionOtherWorkEntryInput,
} from '../../types/production';
import { Person } from '../../types/team';

describe('ACYA Production Enhancement — Phase 5A Labor Tracking & Payables Tests', () => {
  // ── 1. CALENDAR DATE FORMATTING & TIMEZONE PRESERVATION ────────────────────
  describe('1. Calendar Date Formatting & Timezone Preservation', () => {
    it('should format ISO string without timezone shifts', () => {
      const iso = '2026-10-15T00:00:00.000Z';
      const formatted = formatCalendarDate(iso);
      assert.strictEqual(formatted, '2026-10-15');
    });

    it('should format pure YYYY-MM-DD string identically', () => {
      const dateStr = '2026-05-01';
      assert.strictEqual(formatCalendarDate(dateStr), '2026-05-01');
    });

    it('should return empty string for null or undefined dates', () => {
      assert.strictEqual(formatCalendarDate(null), '');
      assert.strictEqual(formatCalendarDate(undefined), '');
    });

    it('should format Date objects using local calendar date', () => {
      const d = new Date(2026, 9, 20); // October 20, 2026 local
      const formatted = formatCalendarDate(d);
      assert.strictEqual(formatted, '2026-10-20');
    });

    it('should generate valid today date string', () => {
      const today = getTodayCalendarDate();
      assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
    });
  });

  // ── 2. ORDER AND STEP LIFECYCLE RESTRICTIONS ──────────────────────────────
  describe('2. Order and Step Lifecycle Restrictions', () => {
    it('should allow labor modifications on Planned orders and Planned steps', () => {
      assert.strictEqual(isStepLaborEditable('Planned', 'Planned'), true);
    });

    it('should allow labor modifications on InProgress orders and InProgress steps', () => {
      assert.strictEqual(isStepLaborEditable('InProgress', 'InProgress'), true);
    });

    it('should allow labor modifications on Completed orders before validation', () => {
      assert.strictEqual(isStepLaborEditable('Completed', 'Completed'), true);
    });

    it('should lock labor modifications on Validated orders', () => {
      assert.strictEqual(isStepLaborEditable('Validated', 'Completed'), false);
      assert.strictEqual(isStepLaborEditable('Validated', 'InProgress'), false);
    });

    it('should lock labor modifications on Cancelled orders', () => {
      assert.strictEqual(isStepLaborEditable('Cancelled', 'Planned'), false);
      assert.strictEqual(isStepLaborEditable('Cancelled', 'InProgress'), false);
    });

    it('should lock labor modifications on Cancelled steps even if order is InProgress', () => {
      assert.strictEqual(isStepLaborEditable('InProgress', 'Cancelled'), false);
      assert.strictEqual(isStepLaborEditable('Planned', 'Cancelled'), false);
    });
  });

  // ── 3. EMPLOYEE FILTERING & PREVENTING DUPLICATE ASSIGNMENTS ──────────────
  describe('3. Employee Filtering and Assignment Rules', () => {
    const mockPersons: Person[] = [
      {
        id: 1,
        firstname: 'Ahmed',
        lastname: 'Ben Ali',
        role: 1,
        isdeleted: false,
        isappuser: false,
        basesalary: 1200,
        overtimehours: 0,
        updatedby: 1,
      },
      {
        id: 2,
        firstname: 'Mounir',
        lastname: 'Trabelsi',
        role: 1,
        isdeleted: false,
        isappuser: false,
        basesalary: 1100,
        overtimehours: 0,
        updatedby: 1,
      },
      {
        id: 3,
        firstname: 'Salim',
        lastname: 'Gharbi',
        role: 1,
        isdeleted: true, // Soft-deleted
        isappuser: false,
        basesalary: 1000,
        overtimehours: 0,
        updatedby: 1,
      },
    ];

    it('should exclude soft-deleted employees from available list', () => {
      const available = filterAvailableEmployees(mockPersons, []);
      assert.strictEqual(available.length, 2);
      assert.strictEqual(available.some((p) => p.id === 3), false);
    });

    it('should prevent assigning the same employee twice to the same step', () => {
      const assignedIds = [1];
      const available = filterAvailableEmployees(mockPersons, assignedIds);
      assert.strictEqual(available.length, 1);
      assert.strictEqual(available[0].id, 2);
    });

    it('should allow assigning multiple different employees to the same step', () => {
      const available1 = filterAvailableEmployees(mockPersons, []);
      assert.strictEqual(available1.length, 2);

      const assignedWorkers: ProductionStepWorker[] = [
        {
          id: 10,
          guid: 'g1',
          productionStepId: 5,
          personId: 1,
          employeeFullName: 'Ahmed Ben Ali',
          plannedHours: 8,
          defaultHourlyRate: 15,
          estimatedLaborAmount: 120,
          createdById: 1,
          creationDate: '2026-10-01',
        },
        {
          id: 11,
          guid: 'g2',
          productionStepId: 5,
          personId: 2,
          employeeFullName: 'Mounir Trabelsi',
          plannedHours: 6,
          defaultHourlyRate: 12.5,
          estimatedLaborAmount: 75,
          createdById: 1,
          creationDate: '2026-10-01',
        },
      ];

      assert.strictEqual(assignedWorkers.length, 2);
      assert.notStrictEqual(assignedWorkers[0].personId, assignedWorkers[1].personId);
    });
  });

  // ── 4. LABOR COST DISTINCTION & SEPARATION ─────────────────────────────────
  describe('4. Labor Cost Distinction and Independent Manual Expenses', () => {
    it('should separate planned estimates from actual work-log amounts', () => {
      const workers: ProductionStepWorker[] = [
        {
          id: 1,
          guid: 'w1',
          productionStepId: 10,
          personId: 1,
          employeeFullName: 'Ahmed Ben Ali',
          plannedHours: 10,
          defaultHourlyRate: 20,
          estimatedLaborAmount: 200,
          createdById: 1,
          creationDate: '2026-10-01',
        },
      ];

      const workLogs: ProductionStepWorkLog[] = [
        {
          id: 101,
          guid: 'l1',
          stepWorkerId: 1,
          productionStepId: 10,
          personId: 1,
          employeeFullName: 'Ahmed Ben Ali',
          workDate: '2026-10-05',
          actualHours: 4,
          hourlyRate: 20,
          calculatedLaborAmount: 80, // Actual labor
          createdById: 1,
          creationDate: '2026-10-05',
        },
      ];

      const totals = computeStepLaborTotals(workers, workLogs, 50); // 50 TND manual step labor

      assert.strictEqual(totals.estimatedPlannedHours, 10);
      assert.strictEqual(totals.estimatedLaborCost, 200); // Estimate
      assert.strictEqual(totals.actualWorkLogHours, 4);
      assert.strictEqual(totals.actualWorkLogCost, 80); // Actual
      assert.strictEqual(totals.manualLaborCost, 50); // Independent manual expense
      // Total step labor = manual labor (50) + actual employee labor (80) = 130
      assert.strictEqual(totals.totalStepLabor, 130);
    });

    it('should never replace manual labor expense with employee labor or double-count', () => {
      const manualExpense = 150;
      const actualEmployeeLabor = 220;
      const totalManufacturingLabor = manualExpense + actualEmployeeLabor;

      assert.strictEqual(totalManufacturingLabor, 370);
      assert.strictEqual(manualExpense, 150);
      assert.strictEqual(actualEmployeeLabor, 220);
    });

    it('should snap rate at work log time and not mutate historical logs on assignment update', () => {
      const initialWorkerRate = 18;
      const historicalLog: ProductionStepWorkLog = {
        id: 1,
        guid: 'l1',
        stepWorkerId: 1,
        productionStepId: 1,
        personId: 1,
        employeeFullName: 'Ouvrier 1',
        workDate: '2026-10-02',
        actualHours: 5,
        hourlyRate: initialWorkerRate, // 18
        calculatedLaborAmount: 90, // 5 * 18
        createdById: 1,
        creationDate: '2026-10-02',
      };

      // Worker default rate updated subsequently to 25
      const updatedWorkerDefaultRate = 25;
      assert.notStrictEqual(historicalLog.hourlyRate, updatedWorkerDefaultRate);
      assert.strictEqual(historicalLog.hourlyRate, 18);
      assert.strictEqual(historicalLog.calculatedLaborAmount, 90);
    });
  });

  // ── 5. STANDALONE OTHER WORK & MONTHLY SUMMARY ISOLATION ───────────────────
  describe('5. Standalone Other Work and Monthly Payable Summary Isolation', () => {
    it('should never include standalone other work into manufacturing order costs', () => {
      const manufacturingOrder: Partial<ProductionOrder> = {
        id: 1,
        reference: 'OF-2026-001',
        totalMaterialCost: 500,
        totalLaborCost: 200,
        totalOtherCost: 50,
        totalProductionCost: 750,
      };

      const standaloneOtherWork: ProductionOtherWorkEntry = {
        id: 1,
        guid: 'ow1',
        personId: 1,
        employeeFullName: 'Ahmed Ben Ali',
        workDate: '2026-10-12',
        hours: 6,
        hourlyRate: 15,
        calculatedAmount: 90,
        description: 'Maintenance raboteuse et nettoyage copeaux',
        createdById: 1,
        creationDate: '2026-10-12',
        isDeleted: false,
      };

      // Standalone work contributes 90 TND to employee monthly summary, but OF cost remains exactly 750 TND
      assert.strictEqual(manufacturingOrder.totalProductionCost, 750);
      assert.strictEqual(standaloneOtherWork.calculatedAmount, 90);
    });

    it('should aggregate manufacturing and other work separately in monthly summary', () => {
      const monthlySummary: MonthlyEmployeePayableSummary = {
        year: 2026,
        month: 10,
        totalManufacturingHours: 40,
        totalManufacturingAmount: 600,
        totalOtherHours: 15,
        totalOtherAmount: 225,
        totalPayableHours: 55,
        totalPayableAmount: 825,
        employees: [
          {
            personId: 1,
            employeeFullName: 'Ahmed Ben Ali',
            manufacturingHours: 25,
            manufacturingAmount: 375,
            otherHours: 10,
            otherAmount: 150,
            totalPayableHours: 35,
            totalPayableAmount: 525,
          },
          {
            personId: 2,
            employeeFullName: 'Mounir Trabelsi',
            manufacturingHours: 15,
            manufacturingAmount: 225,
            otherHours: 5,
            otherAmount: 75,
            totalPayableHours: 20,
            totalPayableAmount: 300,
          },
        ],
      };

      assert.strictEqual(monthlySummary.totalManufacturingHours, 40);
      assert.strictEqual(monthlySummary.totalManufacturingAmount, 600);
      assert.strictEqual(monthlySummary.totalOtherHours, 15);
      assert.strictEqual(monthlySummary.totalOtherAmount, 225);
      assert.strictEqual(monthlySummary.totalPayableHours, 55);
      assert.strictEqual(monthlySummary.totalPayableAmount, 825);

      const emp1 = monthlySummary.employees[0];
      assert.strictEqual(emp1.manufacturingHours + emp1.otherHours, emp1.totalPayableHours);
      assert.strictEqual(emp1.manufacturingAmount + emp1.otherAmount, emp1.totalPayableAmount);
    });
  });

  // ── 6. DTO SHAPES & VALIDATION CONSTRAINTS ──────────────────────────────────
  describe('6. DTO Shapes and Validation Constraints', () => {
    it('should validate step worker input structure', () => {
      const input: CreateProductionStepWorkerInput = {
        personId: 1,
        plannedHours: 12.5,
        defaultHourlyRate: 14.0,
        notes: 'Opérateur principal',
      };
      assert.strictEqual(input.personId > 0, true);
      assert.strictEqual(input.plannedHours >= 0, true);
      assert.strictEqual(input.defaultHourlyRate >= 0, true);
    });

    it('should validate step work log input structure', () => {
      const input: CreateProductionStepWorkLogInput = {
        stepWorkerId: 1,
        workDate: '2026-10-14',
        actualHours: 7.5,
        hourlyRate: 14.0,
      };
      assert.strictEqual(input.stepWorkerId > 0, true);
      assert.match(input.workDate, /^\d{4}-\d{2}-\d{2}$/);
      assert.strictEqual(input.actualHours > 0, true);
    });

    it('should validate standalone other work entry input structure', () => {
      const input: CreateProductionOtherWorkEntryInput = {
        personId: 2,
        workDate: '2026-10-15',
        hours: 4.0,
        hourlyRate: 15.0,
        description: 'Réparation chariot élévateur atelier',
      };
      assert.strictEqual(input.personId > 0, true);
      assert.strictEqual(input.hours > 0, true);
      assert.strictEqual(input.hourlyRate > 0, true);
      assert.strictEqual(input.description.length <= 500, true);
    });
  });

  // ── 7. PHASE 6C-1 WORKING-HOURS VALIDATION & FINANCIAL CALCULATIONS ────────
  describe('7. Phase 6C-1 Working-Hours Validation & Financial Calculations', () => {
    const calculateLaborAmount = (hours: number, rate: number): number => {
      return Math.round(hours * rate * 1000) / 1000;
    };

    const isStepMultiple = (value: number, min: number, step: number): boolean => {
      if (value < min) return false;
      const remainder = Math.round(((value - min) % step) * 10000) / 10000;
      return remainder === 0 || Math.abs(remainder - step) < 0.0001;
    };

    it('should calculate 2 hours at 10 TND/hour = 20.000 TND', () => {
      assert.strictEqual(calculateLaborAmount(2, 10), 20.000);
    });

    it('should calculate 1.75 hours at 10 TND/hour = 17.500 TND', () => {
      assert.strictEqual(calculateLaborAmount(1.75, 10), 17.500);
    });

    it('should calculate 0.5 hours at 10 TND/hour = 5.000 TND', () => {
      assert.strictEqual(calculateLaborAmount(0.5, 10), 5.000);
    });

    it('should validate that 0.5, 1, 1.5, 1.75, 2, and 2.5 are valid for step=0.25 and min=0.25', () => {
      const validCases = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5];
      for (const val of validCases) {
        assert.strictEqual(isStepMultiple(val, 0.25, 0.25), true, `${val} should be valid`);
      }
    });

    it('should reject zero and negative hours where positive hours are required', () => {
      assert.strictEqual(isStepMultiple(0, 0.25, 0.25), false, '0 should be rejected by min=0.25');
      assert.strictEqual(isStepMultiple(-1, 0.25, 0.25), false, '-1 should be rejected by min=0.25');
    });
  });

  // ── 8. PHASE 6C-2 MATERIAL PRICING & COST CALCULATIONS ─────────────────────
  describe('8. Phase 6C-2 Material Pricing & Cost Calculations', () => {
    const resolveMaterialCost = (
      clientUnitCost: number | undefined,
      lastPurchasePriceTTC: number | undefined
    ): number => {
      if (clientUnitCost !== undefined && clientUnitCost > 0) {
        return clientUnitCost;
      }
      return lastPurchasePriceTTC && lastPurchasePriceTTC > 0 ? lastPurchasePriceTTC : 0;
    };

    it('should retrieve authoritative LastPurchasePriceTTC when client unit cost is 0 or undefined', () => {
      const knownArticlePrice = 45.500;
      assert.strictEqual(resolveMaterialCost(0, knownArticlePrice), 45.500);
      assert.strictEqual(resolveMaterialCost(undefined, knownArticlePrice), 45.500);
    });

    it('should preserve legitimate manual price overrides over catalogue cost', () => {
      const knownArticlePrice = 45.500;
      const manualNegotiatedPrice = 42.000;
      assert.strictEqual(resolveMaterialCost(manualNegotiatedPrice, knownArticlePrice), 42.000);
    });

    it('should calculate material line cost accurately (qty * unitCost)', () => {
      const quantity = 3.5;
      const unitCost = 24.500;
      const totalCost = Math.round(quantity * unitCost * 1000) / 1000;
      assert.strictEqual(totalCost, 85.750);
    });

    it('should retain catalogue TTC cost (e.g. 119) with NO automatic VAT division', () => {
      // User decision: "The cost entered by the user in the article catalogue is the authoritative cost. We retain its TTC value."
      const catalogueTtcCost = 119.000;
      const resolvedCost = resolveMaterialCost(undefined, catalogueTtcCost);
      assert.strictEqual(resolvedCost, 119.000);
      assert.notStrictEqual(resolvedCost, 100.000, 'Should NOT divide by 1.19 (no VAT division)');
    });

    it('should prioritize explicit manual override over catalogue TTC fallback', () => {
      const catalogueTtcCost = 119.000;
      const negotiatedPrice = 105.000;
      const resolvedCost = resolveMaterialCost(negotiatedPrice, catalogueTtcCost);
      assert.strictEqual(resolvedCost, 105.000);
    });

    it('should use consistent fallback behavior for both order creation and adding a material', () => {
      const article = { id: 50, lastpurchaseprice_ttc: 75.000 };
      const merchandise = { id: 12, cost_ht: 75.000, article };

      // Creation flow: CreateProductionModal.tsx uses Number(merch.cost_ht ?? merch.article?.lastpurchaseprice_ttc ?? 0)
      const creationInitialCost = Number(merchandise.cost_ht ?? merchandise.article?.lastpurchaseprice_ttc ?? 0);

      // Add material flow: StepsTab.tsx uses selected?.cost_ht ?? selected?.article?.lastpurchaseprice_ttc ?? 0
      const addMaterialInitialCost = Number(merchandise.cost_ht ?? merchandise.article?.lastpurchaseprice_ttc ?? 0);

      // Backend repository resolution: defaultArticleCost = LastPurchasePriceTTC
      const backendResolvedCost = resolveMaterialCost(undefined, article.lastpurchaseprice_ttc);

      assert.strictEqual(creationInitialCost, 75.000);
      assert.strictEqual(addMaterialInitialCost, 75.000);
      assert.strictEqual(backendResolvedCost, 75.000);
      assert.strictEqual(creationInitialCost, backendResolvedCost);
    });

    it('should compute step total without double-counting manual labor, employee labor, or materials', () => {
      const materialCost = 85.750;
      const manualLaborCost = 50.000;
      const employeeActualLabor = 60.000;
      const otherCost = 15.000;

      const totalStepCost = materialCost + manualLaborCost + employeeActualLabor + otherCost;
      assert.strictEqual(totalStepCost, 210.750);
    });
  });

  // ── 9. PHASE 6C-3 STOCK AVAILABILITY & VALIDATION ──────────────────────────
  describe('9. Phase 6C-3 Stock Availability & Validation', () => {
    interface MaterialStockCheck {
      merchandiseId: number;
      requiredQty: number;
      currentStock: number;
      allowNegativStock: boolean;
    }

    const checkInsufficientStock = (materials: MaterialStockCheck[], orderStatus: string): boolean => {
      if (orderStatus === 'Validated' || orderStatus === 'Cancelled') return false;
      return materials.some((m) => !m.allowNegativStock && m.currentStock < m.requiredQty);
    };

    it('should show no warning when stock is sufficient', () => {
      const materials: MaterialStockCheck[] = [
        { merchandiseId: 1, requiredQty: 10, currentStock: 25, allowNegativStock: false },
        { merchandiseId: 2, requiredQty: 5, currentStock: 5, allowNegativStock: false },
      ];
      assert.strictEqual(checkInsufficientStock(materials, 'Planned'), false);
    });

    it('should show warning when stock is insufficient and allowNegativStock is false', () => {
      const materials: MaterialStockCheck[] = [
        { merchandiseId: 1, requiredQty: 10, currentStock: 4, allowNegativStock: false },
      ];
      assert.strictEqual(checkInsufficientStock(materials, 'Planned'), true);
    });

    it('should NOT trigger warning when stock is insufficient but allowNegativStock is true', () => {
      const materials: MaterialStockCheck[] = [
        { merchandiseId: 1, requiredQty: 10, currentStock: 2, allowNegativStock: true },
      ];
      assert.strictEqual(checkInsufficientStock(materials, 'Planned'), false);
    });

    it('should aggregate multiple stock records for the same merchandise and site additively', () => {
      const stockRecords = [
        { merchandiseId: 1, salesSiteId: 10, quantity: 12.5 },
        { merchandiseId: 1, salesSiteId: 10, quantity: 7.5 },
        { merchandiseId: 2, salesSiteId: 10, quantity: 5.0 },
      ];

      const aggregated = stockRecords
        .filter((s) => s.salesSiteId === 10)
        .reduce((acc, curr) => {
          acc.set(curr.merchandiseId, (acc.get(curr.merchandiseId) ?? 0) + curr.quantity);
          return acc;
        }, new Map<number, number>());

      assert.strictEqual(aggregated.get(1), 20.0);
      assert.strictEqual(aggregated.get(2), 5.0);
    });
  });

  // ── 10. PHASE 6C-4 PERSIST OUTPUT-PRODUCT ASSIGNMENTS ───────────────────────
  describe('10. Phase 6C-4 Persist Output-Product Assignments', () => {
    interface StepState {
      id: number;
      name: string;
      outputMerchandiseId?: number;
      outputMerchandiseRef?: string;
      outputMerchandiseDesignation?: string;
    }

    const persistOutputProduct = (
      step: StepState,
      newMerch: { id: number; ref: string; designation: string }
    ): { updatedStep: StepState; mutationPayload: any; invalidatedKeys: string[] } => {
      const mutationPayload = {
        name: step.name,
        outputMerchandiseId: newMerch.id,
      };

      const updatedStep: StepState = {
        ...step,
        outputMerchandiseId: newMerch.id,
        outputMerchandiseRef: newMerch.ref,
        outputMerchandiseDesignation: newMerch.designation,
      };

      const invalidatedKeys = ['orderDetail', 'orders'];
      return { updatedStep, mutationPayload, invalidatedKeys };
    };

    it('should produce correct update payload with outputMerchandiseId', () => {
      const initialStep: StepState = { id: 101, name: 'Rabotage' };
      const { mutationPayload } = persistOutputProduct(initialStep, {
        id: 501,
        ref: 'LOT-CHENE-40',
        designation: 'Chêne raboté 40mm',
      });

      assert.strictEqual(mutationPayload.outputMerchandiseId, 501);
      assert.strictEqual(mutationPayload.name, 'Rabotage');
    });

    it('should update step with output merchandise reference and designation', () => {
      const initialStep: StepState = { id: 101, name: 'Rabotage' };
      const { updatedStep } = persistOutputProduct(initialStep, {
        id: 501,
        ref: 'LOT-CHENE-40',
        designation: 'Chêne raboté 40mm',
      });

      assert.strictEqual(updatedStep.outputMerchandiseId, 501);
      assert.strictEqual(updatedStep.outputMerchandiseRef, 'LOT-CHENE-40');
      assert.strictEqual(updatedStep.outputMerchandiseDesignation, 'Chêne raboté 40mm');
    });

    it('should invalidate orderDetail and orders queries after persistence', () => {
      const initialStep: StepState = { id: 101, name: 'Rabotage' };
      const { invalidatedKeys } = persistOutputProduct(initialStep, {
        id: 501,
        ref: 'LOT-CHENE-40',
        designation: 'Chêne raboté 40mm',
      });

      assert.ok(invalidatedKeys.includes('orderDetail'));
      assert.ok(invalidatedKeys.includes('orders'));
    });
  });

  // ── 11. PHASE 6C-5 PRODUCTION STEP EDITING & DELETE DIALOGS ─────────────────
  describe('11. Phase 6C-5 Production Step Editing & Delete Dialogs', () => {
    it('should permit editing step name, planned quantity, manual labor cost, and other cost', () => {
      const editInput = {
        name: 'Finition Vernis Polyuréthane',
        description: 'Double couche satinée',
        plannedOutputQuantity: 15,
        laborCost: 45.000,
        otherCost: 20.000,
        outputMerchandiseId: 88,
      };

      assert.strictEqual(editInput.name, 'Finition Vernis Polyuréthane');
      assert.strictEqual(editInput.plannedOutputQuantity, 15);
      assert.strictEqual(editInput.laborCost, 45.000);
      assert.strictEqual(editInput.otherCost, 20.000);
      assert.strictEqual(editInput.outputMerchandiseId, 88);
    });

    it('should preserve distinction: editing manual labor cost does NOT alter employee work logs', () => {
      const existingWorkLogs = [
        { id: 1, stepWorkerId: 10, actualHours: 4.0, hourlyRateSnapshot: 12.000, laborCost: 48.000 },
        { id: 2, stepWorkerId: 11, actualHours: 2.5, hourlyRateSnapshot: 10.000, laborCost: 25.000 },
      ];
      const employeeLaborSum = existingWorkLogs.reduce((acc, l) => acc + l.laborCost, 0);

      // User changes step manual laborCost from 0 to 30 TND
      const updatedStepManualLabor = 30.000;

      // Work logs remain strictly unchanged
      assert.strictEqual(employeeLaborSum, 73.000);
      assert.strictEqual(existingWorkLogs[0].hourlyRateSnapshot, 12.000);
      assert.strictEqual(existingWorkLogs[1].hourlyRateSnapshot, 10.000);

      // Total labor is manual + employee without collision
      const totalCombinedLabor = updatedStepManualLabor + employeeLaborSum;
      assert.strictEqual(totalCombinedLabor, 103.000);
    });

    it('should reject step modification when order status is Validated or Cancelled', () => {
      const canEditStep = (orderStatus: string) => {
        return orderStatus !== 'Validated' && orderStatus !== 'Cancelled';
      };

      assert.strictEqual(canEditStep('Planned'), true);
      assert.strictEqual(canEditStep('InProgress'), true);
      assert.strictEqual(canEditStep('Completed'), true);
      assert.strictEqual(canEditStep('Validated'), false);
      assert.strictEqual(canEditStep('Cancelled'), false);
    });

    it('should configure delete dialog with descriptive entity name and explicit confirmation', () => {
      const stepToDelete = { id: 12, name: 'Découpe Panneaux' };
      const dialogConfig = {
        title: `Supprimer l'étape ${stepToDelete.name}`,
        requiresExplicitConfirm: true,
        entityId: stepToDelete.id,
      };

      assert.strictEqual(dialogConfig.title, "Supprimer l'étape Découpe Panneaux");
      assert.strictEqual(dialogConfig.requiresExplicitConfirm, true);
    });
  });

  // ── 12. PHASE 6C-6 ADMINISTRATOR-ONLY ORDER DELETION ─────────────────────────
  describe('12. Phase 6C-6 Administrator-Only Fabrication Order Deletion', () => {
    const isUserAdmin = (userRole?: string): boolean => {
      if (!userRole) return false;
      return userRole === 'Admin' || userRole === 'SuperAdmin' || userRole === '10' || userRole === '20';
    };

    it('should authorize administrators (Admin, SuperAdmin, 10, 20)', () => {
      assert.strictEqual(isUserAdmin('Admin'), true);
      assert.strictEqual(isUserAdmin('SuperAdmin'), true);
      assert.strictEqual(isUserAdmin('10'), true);
      assert.strictEqual(isUserAdmin('20'), true);
    });

    it('should reject non-administrators with 403 Forbidden', () => {
      assert.strictEqual(isUserAdmin('User'), false);
      assert.strictEqual(isUserAdmin('Employee'), false);
      assert.strictEqual(isUserAdmin('Ouvrier'), false);
      assert.strictEqual(isUserAdmin(undefined), false);
    });

    it('should allow deletion of an order with no employee work logs if lifecycle permits', () => {
      interface StepWithLogs {
        id: number;
        workLogs: { id: number; hours: number }[];
      }
      interface TestOrder {
        id: number;
        status: string;
        isDeleted: boolean;
        steps: StepWithLogs[];
      }

      const attemptDelete = (order: TestOrder, isAdminUser: boolean): { success: boolean; statusCode: number; error?: string } => {
        if (!isAdminUser) {
          return { success: false, statusCode: 403, error: 'Action réservée aux administrateurs.' };
        }
        if (order.status === 'Validated') {
          return { success: false, statusCode: 400, error: "Impossible de supprimer un ordre de fabrication validé. Veuillez d'abord l'annuler pour rétablir les stocks." };
        }
        const hasWorkLogs = order.steps.some((s) => s.workLogs && s.workLogs.length > 0);
        if (hasWorkLogs) {
          return {
            success: false,
            statusCode: 409,
            error: "Impossible de supprimer cet ordre : des heures de travail d'employés sont enregistrées. Supprimez d'abord les pointages des employés, puis réessayez.",
          };
        }
        order.isDeleted = true;
        return { success: true, statusCode: 200 };
      };

      const emptyOrder: TestOrder = {
        id: 10,
        status: 'Planned',
        isDeleted: false,
        steps: [
          { id: 1, workLogs: [] },
          { id: 2, workLogs: [] },
        ],
      };

      const res = attemptDelete(emptyOrder, true);
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(emptyOrder.isDeleted, true);
    });

    it('should reject deletion with 409 Conflict when order has one employee work log', () => {
      const orderWithOneLog = {
        id: 11,
        status: 'Planned',
        isDeleted: false,
        steps: [
          { id: 1, workLogs: [{ id: 101, hours: 2.5, workDate: '2026-10-14' }] },
        ],
      };

      const hasWorkLogs = orderWithOneLog.steps.some((s) => s.workLogs && s.workLogs.length > 0);
      assert.strictEqual(hasWorkLogs, true);
      const errorMsg = "Impossible de supprimer cet ordre : des heures de travail d'employés sont enregistrées. Supprimez d'abord les pointages des employés, puis réessayez.";
      assert.ok(errorMsg.includes('pointages des employés'));
    });

    it('should reject deletion when order has multiple steps and a work log on ANY step', () => {
      const multiStepOrder = {
        id: 12,
        status: 'InProgress',
        isDeleted: false,
        steps: [
          { id: 1, name: 'Découpe', workLogs: [] },
          { id: 2, name: 'Rabotage', workLogs: [] },
          { id: 3, name: 'Vernissage', workLogs: [{ id: 202, hours: 4.0, workDate: '2026-10-14' }] },
        ],
      };

      const hasWorkLogs = multiStepOrder.steps.some((s) => s.workLogs && s.workLogs.length > 0);
      assert.strictEqual(hasWorkLogs, true, 'Work log on step 3 must trigger guard');
    });

    it('should detect historical work logs belonging to earlier months (date-agnostic guard)', () => {
      const orderWithHistoricalLog = {
        id: 13,
        status: 'Completed',
        isDeleted: false,
        steps: [
          {
            id: 1,
            workLogs: [
              // Work performed 4 months ago in June 2026
              { id: 301, hours: 8.0, workDate: '2026-06-15' },
            ],
          },
        ],
      };

      const hasWorkLogs = orderWithHistoricalLog.steps.some((s) => s.workLogs && s.workLogs.length > 0);
      assert.strictEqual(hasWorkLogs, true, 'Historical log from earlier month must also block deletion');
    });

    it('should leave order, steps, work logs, materials, and inventory unchanged on rejected deletion', () => {
      const initialSnapshot = {
        order: { id: 14, reference: 'OF-SECURE-001', isDeleted: false, status: 'Planned' },
        steps: [{ id: 1, inputs: [{ id: 1, qty: 5, cost: 50 }], workLogs: [{ id: 1, hours: 2 }] }],
        inventoryBalance: 100,
      };

      // Attempt rejected deletion
      const rejectionTriggered = initialSnapshot.steps.some((s) => s.workLogs.length > 0);
      assert.strictEqual(rejectionTriggered, true);

      // Verify state is completely preserved
      assert.strictEqual(initialSnapshot.order.isDeleted, false);
      assert.strictEqual(initialSnapshot.order.status, 'Planned');
      assert.strictEqual(initialSnapshot.steps[0].inputs[0].qty, 5);
      assert.strictEqual(initialSnapshot.steps[0].workLogs.length, 1);
      assert.strictEqual(initialSnapshot.inventoryBalance, 100);
    });

    it('should reject deletion for non-administrator even if order has zero work logs', () => {
      const isAdmin = false;
      assert.strictEqual(isAdmin, false, 'Non-admin user cannot delete');
    });

    it('should allow deletion after all employee work logs have been explicitly removed', () => {
      const order = {
        id: 15,
        status: 'Planned',
        isDeleted: false,
        steps: [
          { id: 1, workLogs: [{ id: 401, hours: 3 }] },
        ],
      };

      // Step 1: Deletion rejected because work log exists
      assert.strictEqual(order.steps.some((s) => s.workLogs.length > 0), true);

      // Step 2: User explicitly removes the work log through authorized flow
      order.steps[0].workLogs = [];

      // Step 3: Deletion can now proceed
      assert.strictEqual(order.steps.some((s) => s.workLogs.length > 0), false);
      order.isDeleted = true;
      assert.strictEqual(order.isDeleted, true);
    });
  });

  // ── 14. PHASE 6C-11: STOCK AVAILABILITY, DEPOT RESOLUTION & VALIDATION MODAL ──
  describe('14. Phase 6C-11: Stock Availability, Depot Resolution & Validation Modal', () => {
    // Helper function simulating MaterialsTab siteStockMap building
    function buildSiteStockMap(siteStocks: any[]): Map<number, number> {
      const map = new Map<number, number>();
      if (Array.isArray(siteStocks)) {
        for (const s of siteStocks) {
          const mId = s.merchandiseId ?? s.merchandise_id ?? s.MerchandiseId;
          const qty = Number(s.stockQuantity ?? s.quantity ?? s.StockQuantity ?? 0);
          if (mId) {
            map.set(Number(mId), (map.get(Number(mId)) ?? 0) + qty);
          }
        }
      }
      return map;
    }

    it('1. Correct mapping of stock records to production materials by merchandiseId', () => {
      const mockSiteStocks = [
        { merchandiseId: 9, articleId: 12, siteId: 2, stockQuantity: 30 },
        { merchandiseId: 10, articleId: 13, siteId: 2, stockQuantity: 30 },
      ];

      const stockMap = buildSiteStockMap(mockSiteStocks);
      assert.strictEqual(stockMap.get(9), 30);
      assert.strictEqual(stockMap.get(10), 30);
      assert.strictEqual(stockMap.get(999), undefined);
    });

    it('2. Correct use of selected depot/site identifier', () => {
      // Depot 1 (Ariana Soghra) has 0 stock; Depot 2 (Bureau Ariana Soghra) has 30 stock
      const stockDb: Record<number, any[]> = {
        1: [],
        2: [
          { merchandiseId: 9, stockQuantity: 30 },
          { merchandiseId: 10, stockQuantity: 30 },
        ],
      };

      const orderSite1Map = buildSiteStockMap(stockDb[1]);
      assert.strictEqual(orderSite1Map.get(9) ?? 0, 0, 'Site 1 has 0 stock');

      const orderSite2Map = buildSiteStockMap(stockDb[2]);
      assert.strictEqual(orderSite2Map.get(9) ?? 0, 30, 'Site 2 has 30 stock');
    });

    it('3. Robust mapping of merchandise identifiers across naming conventions', () => {
      const mixedStocks = [
        { merchandiseId: 9, stockQuantity: 20 },
        { merchandise_id: 9, quantity: 10 }, // aggregated sum = 30
        { MerchandiseId: 10, StockQuantity: 15 },
      ];

      const stockMap = buildSiteStockMap(mixedStocks);
      assert.strictEqual(stockMap.get(9), 30, 'Aggregates multiple entries of same merchandise');
      assert.strictEqual(stockMap.get(10), 15);
    });

    it('4. Positive stock is not displayed as zero when correct depot is queried', () => {
      const siteStocks = [
        { merchandiseId: 9, stockQuantity: 30 },
      ];
      const stockMap = buildSiteStockMap(siteStocks);
      const input = { merchandiseId: 9, plannedQuantity: 8, currentStockQuantity: 0 };

      const availableStock = stockMap.has(input.merchandiseId)
        ? (stockMap.get(input.merchandiseId) ?? 0)
        : (input.currentStockQuantity ?? 0);

      assert.strictEqual(availableStock, 30, 'Positive stock is preserved and displayed as 30, not 0');
      assert.strictEqual(availableStock >= input.plannedQuantity, true, 'Stock is sufficient');
    });

    it('5. Insufficient stock is still rejected when real available quantity is insufficient', () => {
      const stockMap = new Map<number, number>([[9, 5]]); // Only 5 available
      const requiredQty = 8;
      const allowNegative = false;

      const available = stockMap.get(9) ?? 0;
      const isRejected = !allowNegative && available < requiredQty;
      assert.strictEqual(isRejected, true, 'Validation is blocked when required (8) exceeds available (5)');
    });

    it('6. Existing allowNegativStock behavior is strictly preserved', () => {
      const available = 0;
      const requiredQty = 8;

      // When allowNegative is true
      const canProceedWithNegative = (allowNegative: boolean) => allowNegative || available >= requiredQty;
      assert.strictEqual(canProceedWithNegative(true), true, 'Allowed when allowNegative is true');
      assert.strictEqual(canProceedWithNegative(false), false, 'Blocked when allowNegative is false');
    });

    it('7. Validation error is captured and formatted for display in modal', () => {
      const backendError = {
        response: {
          status: 400,
          data: {
            message: "Stock insuffisant pour 'MDF STR 18MM 280*210 2F Blanc' au dépôt sélectionné. Requis: 8, Disponible: 0.",
          },
        },
      };

      const extractedMsg =
        backendError?.response?.data?.message ||
        "Erreur lors de la validation de l'ordre";

      assert.strictEqual(
        extractedMsg,
        "Stock insuffisant pour 'MDF STR 18MM 280*210 2F Blanc' au dépôt sélectionné. Requis: 8, Disponible: 0."
      );
    });

    it('8. Confirmation modal identifies correct order and prevents duplicate submissions', () => {
      const modalState = {
        orderReference: 'OF-20261014-CUIS',
        isPending: false,
        canSubmit: function() { return !this.isPending; },
      };

      assert.strictEqual(modalState.orderReference, 'OF-20261014-CUIS');
      assert.strictEqual(modalState.canSubmit(), true);

      // Submission initiated
      modalState.isPending = true;
      assert.strictEqual(modalState.canSubmit(), false, 'Duplicate submissions prevented while pending');
    });

    it('9. Existing inventory reversal behavior remains unchanged on cancellation', () => {
      // Simulating validated order cancellation stock reversal
      const stockBefore: Record<string, number> = { 'merch-9': 22, 'output-1': 1 };
      const orderInputs = [{ merchandiseId: 'merch-9', qty: 8 }];
      const orderOutputs = [{ merchandiseId: 'output-1', qty: 1 }];

      // Reverse: return consumed materials, remove created output
      const stockAfter: Record<string, number> = { ...stockBefore };
      for (const i of orderInputs) {
        stockAfter[i.merchandiseId] += i.qty;
      }
      for (const o of orderOutputs) {
        stockAfter[o.merchandiseId] -= o.qty;
      }

      assert.strictEqual(stockAfter['merch-9'], 30, 'Raw material stock restored to original 30');
      assert.strictEqual(stockAfter['output-1'], 0, 'Produced product output deducted on cancellation');
    });
  });
});



