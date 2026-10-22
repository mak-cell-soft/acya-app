export type MobileBuildStatus = 'Pending' | 'Building' | 'Succeeded' | 'Failed' | 'Cancelled';

export interface MobileBuild {
  id: number;
  tenantId: string;
  version: string;
  buildNumber: number;
  status: MobileBuildStatus;
  artifactPath?: string | null;
  artifactFileName?: string | null;
  artifactSize: number | null;
  sha256: string | null;
  releaseNotes: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  createdBy: string | null;
  gitCommitHash: string | null;
  gitBranch: string | null;
  workflowRunId: string | null;
  isActive: boolean;
  isArtifactAvailable?: boolean;
  environment?: string;
}

export interface MobileRelease {
  id: number;
  mobileBuildId: number;
  tenantId: string;
  version: string;
  buildNumber: number;
  status: string;
  isCurrent: boolean;
  publishedAt: string;
  publishedBy?: string | null;
  publishedByName?: string | null;
  publishedByEmail?: string | null;
  createdAt: string;
  completedAt?: string | null;
  artifactFileName?: string | null;
  artifactSize?: number | null;
  sha256?: string | null;
  releaseNotes?: string | null;
  environment?: string;
}

export interface MobileDownloadResponse {
  success: boolean;
  releaseId?: number;
  tenantId?: string;
  version?: string;
  fileName: string;
  downloadUrl: string;
  error?: string;
}

export interface MobileTenantSummary {
  id: number;
  slug: string;
  name: string;
  isActive: boolean;
}

export interface CreateMobileBuildInput {
  tenantId: string;
  version: string;
  releaseNotes?: string;
  gitBranch?: string;
  environment?: string;
}

export interface MobileTenantUser {
  id: number;
  login?: string;
  userName?: string;
  name?: string;
  fullName?: string;
  email: string;
  canView?: boolean;
  canDownload?: boolean;
}

export interface SendMobileAppResult {
  success: boolean;
  message: string;
  recipient?: string;
  recipientEmail?: string;
  recipientName?: string;
  portalUrl?: string;
}

export interface NextMobileVersionInfo {
  tenantId: string;
  suggestedVersion: string;
  patchVersion: string;
  minorVersion: string;
  majorVersion: string;
  nextBuildNumber: number;
  latestVersion?: string | null;
  latestStatus?: string | null;
}

export type FirebaseAppProvisioningStatus = 'NotRegistered' | 'Pending' | 'Active' | 'Failed';

export interface FirebaseAppSummary {
  tenantId: string;
  tenantName: string;
  packageName: string;
  firebaseProjectId: string;
  firebaseAppId: string | null;
  displayName: string;
  status: FirebaseAppProvisioningStatus | string;
  hasConfiguration: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface TenantFirebaseAppStatus {
  tenantId: string;
  firebaseProjectId: string;
  firebaseAppId: string | null;
  packageName: string;
  displayName: string;
  status: FirebaseAppProvisioningStatus | string;
  hasConfiguration: boolean;
  sha1Fingerprint?: string | null;
  sha256Fingerprint?: string | null;
  createdAt: string;
  updatedAt: string;
}
