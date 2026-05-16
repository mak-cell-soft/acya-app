import { useQuery } from '@tanstack/react-query';
import { appVariableService } from '@/services/configuration/app-variable.service';
import { AppVariable } from '@/types/article';

export const useAppVariables = (nature: string) => {
  return useQuery<AppVariable[]>({
    queryKey: ['app-variables', nature],
    queryFn: () => appVariableService.getAll(nature),
  });
};
