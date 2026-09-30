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
  recipientEmail?: string;
  recipientName?: string;
  portalUrl?: string;
}
