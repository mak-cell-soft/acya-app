import api from '@/lib/axios';
import { SupportTicketResponse } from '@/types/support';

export const supportService = {
  /**
   * Submits a support ticket with optional attachment via multipart/form-data.
   */
  submitTicket: async (formData: FormData): Promise<SupportTicketResponse> => {
    const response = await api.post<SupportTicketResponse>('/Support/submit', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
