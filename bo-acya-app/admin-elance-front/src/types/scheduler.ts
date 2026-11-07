export interface SchedulerScheduleInfo {
  time: string;
  timezone: string;
  utcTime: string;
  onCalendar: string;
  summary: string;
}

export interface SchedulerNextRunInfo {
  utc: string | null;
  local: string | null;
  systemdNextElapseUtc: string | null;
}

export interface SchedulerLastRunInfo {
  timestamp: string | null;
  outcome: string;
  exitCode: number | null;
  durationSeconds: number | null;
  trigger: string | null;
  snapshotId: string | null;
  errorMessage: string | null;
}

export interface SchedulerSafetyInfo {
  repositoryWritesAuthorized: boolean;
  backupExecutionPermitted: boolean;
  safetyNotice: string | null;
}

export interface SchedulerCommunicationInfo {
  transport: string;
  productionHost: string;
  status: string;
  errorMessage: string | null;
}

export interface SchedulerStatus {
  schema: string;
  timerUnit: string;
  serviceUnit: string;
  enabled: boolean;
  active: boolean;
  serviceActive: boolean;
  state: "active" | "enabled" | "disabled" | "communication_error" | string;
  schedule: SchedulerScheduleInfo;
  nextRun: SchedulerNextRunInfo;
  lastRun: SchedulerLastRunInfo;
  safety: SchedulerSafetyInfo;
  communication: SchedulerCommunicationInfo;
}

export interface UpdateDailyScheduleRequest {
  time: string;
  timezone: string;
}

