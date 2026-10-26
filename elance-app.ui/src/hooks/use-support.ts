import { useMutation } from '@tanstack/react-query';
import { supportService } from '@/services/components/support.service';
import { SupportTicketResponse } from '@/types/support';

export function useSubmitSupportTicket() {
  return useMutation<SupportTicketResponse, Error, FormData>({
    mutationFn: (formData: FormData) => supportService.submitTicket(formData),
  });
}

