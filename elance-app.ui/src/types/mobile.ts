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
  environment?: string | null;
}

export interface MobileDownloadResponse {
  releaseId: number;
  tenantId: string;
  version: string;
  fileName: string;
  downloadUrl: string;
  expiresAt: string;
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
