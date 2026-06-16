import api from '@/lib/axios';
import { TejPasswordDto, TejSubmitCertificateDto, TejVerifyBeneficiaryResponse, TejUploadResult } from '@/types/tej/tej.types';

export const tejService = {
  verifyPassword: async (dto: TejPasswordDto) => {
    const response = await api.post('/tej/verify-password', dto);
    return response.data;
  },

  getUsername: async (): Promise<{ username: string }> => {
    const response = await api.get('/tej/username');
    return response.data;
  },

  verifyBeneficiary: async (identifier: string): Promise<TejVerifyBeneficiaryResponse> => {
    const response = await api.get(`/tej/verify-beneficiary/${identifier}`);
    return response.data;
  },

  submitCertificate: async (dto: TejSubmitCertificateDto): Promise<TejUploadResult> => {
    const response = await api.post('/tej/submit-certificate', dto);
    return response.data;
  }
};
