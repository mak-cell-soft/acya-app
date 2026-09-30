import api from '@/lib/axios';
import { MobileRelease, MobileDownloadResponse, MobileTenantUser, SendMobileAppResult } from '@/types/mobile';
import { AxiosError } from 'axios';

export const mobileReleaseService = {
  /**
   * Retrieves the current published mobile release for the authenticated user's tenant.
   * Returns null if no release is currently published for this tenant (HTTP 404).
   */
  getCurrentRelease: async (): Promise<MobileRelease | null> => {
    try {
      const response = await api.get<MobileRelease>('/mobile/releases/current');
      return response.data;
    } catch (error: unknown) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Authorizes and generates a short-lived download token for the specified release.
   */
  requestDownload: async (releaseId: number): Promise<MobileDownloadResponse> => {
    const response = await api.post<MobileDownloadResponse>(`/mobile/releases/${releaseId}/download`);
    return response.data;
  },

  /**
   * Retrieves authorized users of the tenant for invitation sending.
   */
  getTenantUsers: async (): Promise<MobileTenantUser[]> => {
    const response = await api.get<MobileTenantUser[]>('/mobile/releases/users');
    return response.data;
  },

  /**
   * Sends the mobile app invitation email to a specific tenant user.
   */
  sendMobileApp: async (userId: number): Promise<SendMobileAppResult> => {
    const response = await api.post<SendMobileAppResult>('/mobile/releases/send', { userId });
    return response.data;
  },
};
