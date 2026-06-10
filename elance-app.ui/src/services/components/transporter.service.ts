import api from '@/lib/axios';

const transformPayload = (model: any) => {
  let payload = { ...model };
  if (payload.fullname && (!payload.firstname || !payload.lastname)) {
    const parts = payload.fullname.trim().split(' ');
    payload.firstname = parts[0] || '.';
    payload.lastname = parts.slice(1).join(' ') || '.';
  }
  if (typeof payload.car === 'string') {
    payload.car = { serialnumber: payload.car };
  }
  return payload;
};

export const transporterService = {
  add: async (model: any) => {
    const response = await api.post('/Transporter/Add', transformPayload(model));
    return response.data;
  },

  getAll: async () => {
    const response = await api.get('/Transporter');
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/Transporter/${id}`);
    return response.data;
  },

  put: async (id: number, model: any) => {
    const response = await api.put(`/Transporter/${id}`, transformPayload(model));
    return response.data;
  }
};
