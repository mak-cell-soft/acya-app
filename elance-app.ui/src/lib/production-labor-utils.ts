import { ProductionOrder, ProductionStep, ProductionStepWorker, ProductionStepWorkLog } from '@/types/production';
import { Person } from '@/types/team';

/**
 * Format a calendar date to YYYY-MM-DD safely without timezone shifts.
 */
export function formatCalendarDate(date?: string | Date | null): string {
  if (!date) return '';
  if (typeof date === 'string') {
    return date.split('T')[0];
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get current date formatted as YYYY-MM-DD in local calendar time.
 */
export function getTodayCalendarDate(): string {
  return formatCalendarDate(new Date());
}

/**
 * Determine if a manufacturing order or step allows labor modifications.
 * Orders with status 'Validated' or 'Cancelled', or steps with status 'Cancelled', are locked.
 */
export function isStepLaborEditable(orderStatus: string, stepStatus?: string): boolean {
  if (orderStatus === 'Validated' || orderStatus === 'Cancelled') {
    return false;
  }
  if (stepStatus === 'Cancelled') {
    return false;
  }
  return true;
}

/**
 * Filter persons that can be assigned to a step:
 * Must not be soft-deleted and must not already be assigned to this step.
 */
export function filterAvailableEmployees(
  allPersons: Person[] = [],
  assignedPersonIds: number[] = []
): Person[] {
  const assignedSet = new Set(assignedPersonIds);
  return allPersons.filter((p) => !p.isdeleted && !assignedSet.has(p.id));
}

/**
 * Helper to compute client-side labor statistics for UI display.
 * Note: backend totals remain authoritative; this provides intermediate summary data.
 */
export function computeStepLaborTotals(
  workers: ProductionStepWorker[] = [],
  workLogs: ProductionStepWorkLog[] = [],
  stepManualLaborCost: number = 0
) {
  const estimatedPlannedHours = workers.reduce((sum, w) => sum + (Number(w.plannedHours) || 0), 0);
  const estimatedLaborCost = workers.reduce((sum, w) => sum + (Number(w.estimatedLaborAmount) || 0), 0);

  const actualWorkLogHours = workLogs.reduce((sum, l) => sum + (Number(l.actualHours) || 0), 0);
  const actualWorkLogCost = workLogs.reduce((sum, l) => sum + (Number(l.calculatedLaborAmount) || 0), 0);

  // Total manufacturing labor is manual step labor + actual work log employee labor
  const totalStepLabor = (Number(stepManualLaborCost) || 0) + actualWorkLogCost;

  return {
    estimatedPlannedHours,
    estimatedLaborCost,
    actualWorkLogHours,
    actualWorkLogCost,
    manualLaborCost: Number(stepManualLaborCost) || 0,
    totalStepLabor,
  };
}
