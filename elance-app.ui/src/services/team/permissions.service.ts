import api from '@/lib/axios';
import { UserPermissionsDto } from '@/types/permissions';

export const permissionsService = {
  getByUserId: async (userId: number): Promise<UserPermissionsDto> => {
    const response = await api.get(`/Permissions/${userId}`);
    return response.data;
  },

  update: async (userId: number, data: UserPermissionsDto): Promise<UserPermissionsDto> => {
    const response = await api.put(`/Permissions/${userId}`, data);
    return response.data;
  },

  getMyPermissions: async (): Promise<UserPermissionsDto> => {
    const response = await api.get('/Permissions/mine');
    return response.data;
  }
};
