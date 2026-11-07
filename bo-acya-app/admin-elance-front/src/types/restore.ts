export type RestoreLifecycleState =
  | "Pending"
  | "Extracting"
  | "Verifying"
  | "Staging"
  | "Prepared"
  | "BackingUpCurrent"
  | "CuttingOver"
  | "Validating"
  | "Completed"
  | "Failed"
  | "RollingBack"
  | "RolledBack"
  | "RollbackFailed";

export type RestoreOutcomeKind =
  | "in_progress"
  | "succeeded"
  | "failed"
  | "rolled_back"
  | "rollback_failed";

export interface TenantSnapshotRestorePoint {
  snapshotId: string;
  snapshotShortId: string;
  snapshotTimestamp: string;
  dumpSize: number | null;
  manifestSha256: string | null;
  checksumVerificationStatus: string;
  snapshotVerificationStatus: string;
  tenantPresenceStatus: string;
  restoreEligibility: boolean;
  ineligibilityReason: string | null;
  ineligibilityExplanation: string | null;
}

export interface TenantSnapshotEligibilityDetail {
  tenantId: number;
  tenantName: string;
  tenantSlug: string;
  schemaName: string;
  snapshotId: string;
  snapshotShortId: string;
  snapshotTimestamp: string;
  dumpSize: number | null;
  manifestSha256: string | null;
  checksumVerificationStatus: string;
  snapshotVerificationStatus: string;
  tenantPresenceStatus: string;
  restoreEligibility: boolean;
  ineligibilityReason: string | null;
  ineligibilityExplanation: string | null;
  registryMappingVerified: boolean;
  anotherRestoreInProgress: boolean;
  canSubmitRestore: boolean;
  requiredConfirmationTenantSlug: string;
  requiredConfirmationSnapshotId: string;
}

export interface TenantRestoreAuditEntry {
  timestampUtc: string;
  operationId: string;
  state: RestoreLifecycleState | string;
  action: string;
  summary: string;
  performedBy: string;
}

export interface TenantRestoreJobStatus {
  operationId: string;
  tenantId: number;
  tenantName: string;
  tenantSlug: string;
  schemaName: string;
  snapshotId: string;
  snapshotShortId: string;
  snapshotTimestamp: string | null;
  currentState: RestoreLifecycleState | string;
  finalState: RestoreLifecycleState | string | null;
  isTerminal: boolean;
  outcome: RestoreOutcomeKind | string;
  stateHistory: string[];
  extractedDumpSha256: string | null;
  preRestoreBackupCreated: boolean;
  preRestoreBackupSha256: string | null;
  stagingTableCount: number | null;
  restoredTableCount: number | null;
  unaffectedTenantCount: number | null;
  recoveryArtifactsRetained: boolean;
  rollbackPerformed: boolean;
  rollbackSucceeded: boolean | null;
  errorCategory: string | null;
  errorMessage: string | null;
  requestedBy: string;
  startedAtUtc: string;
  updatedAtUtc: string;
  finishedAtUtc: string | null;
  auditTrail: TenantRestoreAuditEntry[];
}

export interface TenantRestoreHistoryResponse {
  tenantId: number;
  tenantName: string;
  tenantSlug: string;
  schemaName: string;
  isActive: boolean;
  catalogSchema: string;
  catalogGeneratedAt: string | null;
  totalSnapshotsIndexed: number;
  eligibleSnapshotCount: number;
  anotherRestoreInProgress: boolean;
  activeOrLatestOperation: TenantRestoreJobStatus | null;
  restorePoints: TenantSnapshotRestorePoint[];
}

export interface TenantRestoreStatusOverview {
  tenantId: number;
  tenantName: string;
  tenantSlug: string;
  schemaName: string;
  anotherRestoreInProgress: boolean;
  activeOrLatestOperation: TenantRestoreJobStatus | null;
  recentOperations: TenantRestoreJobStatus[];
}

export interface SubmitTenantRestoreRequest {
  snapshotId: string;
  confirmTenantSlug: string;
  confirmSnapshotId: string;
}

export interface RestoreStageDefinition {
  state: RestoreLifecycleState;
  stepNumber: number;
  label: string;
  shortDescription: string;
}

export const ORDERED_RESTORE_STAGES: readonly RestoreStageDefinition[] = [
  {
    state: "Pending",
    stepNumber: 1,
    label: "Pending",
    shortDescription: "Validate catalog eligibility & lock",
  },
  {
    state: "Extracting",
    stepNumber: 2,
    label: "Extracting",
    shortDescription: "Read-only Restic dump extraction",
  },
  {
    state: "Verifying",
    stepNumber: 3,
    label: "Verifying",
    shortDescription: "SHA-256 & single-schema TOC check",
  },
  {
    state: "Staging",
    stepNumber: 4,
    label: "Staging",
    shortDescription: "Isolated temp DB restoration",
  },
  {
    state: "Prepared",
    stepNumber: 5,
    label: "Prepared",
    shortDescription: "Structural & constraint validation",
  },
  {
    state: "BackingUpCurrent",
    stepNumber: 6,
    label: "BackingUpCurrent",
    shortDescription: "Pre-restore live schema backup",
  },
  {
    state: "CuttingOver",
    stepNumber: 7,
    label: "CuttingOver",
    shortDescription: "Controlled schema replacement",
  },
  {
    state: "Validating",
    stepNumber: 8,
    label: "Validating",
    shortDescription: "Post-cutover & 15-tenant check",
  },
  {
    state: "Completed",
    stepNumber: 9,
    label: "Completed",
    shortDescription: "Tenant reactivated & verified",
  },
] as const;

