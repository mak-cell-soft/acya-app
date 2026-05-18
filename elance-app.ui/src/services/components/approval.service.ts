import api from '@/lib/axios';

export enum ApprovalDecision {
  Pending = 1,
  Approved = 2,
  Rejected = 3
}

export interface ApprovalConfig {
  id?: number;
  enterpriseId: number;
  thresholdAmount: number | null;
  approverEmails: string | null;
  approverRoles: string | null; // JSON string of role array
}

export interface DocumentApproval {
  id: number;
  documentId: number;
  document?: any; // DocumentDto representation
  submittedByUserId: number;
  submittedBy?: {
    id: number;
    email: string;
    fullname: string;
    person?: {
      firstname: string;
      lastname: string;
    };
  };
  decidedByUserId?: number;
  decidedBy?: any;
  decision: ApprovalDecision;
  rejectionReason: string | null;
  submittedAt: string;
  decidedAt: string | null;
}

export const approvalService = {
  getConfig: async (enterpriseId: number) => {
    const response = await api.get(`/Approval/config/${enterpriseId}`);
    return response.data;
  },

  saveConfig: async (config: any) => {
    const response = await api.put('/Approval/config', config);
    return response.data;
  },

  submit: async (documentId: number, userId: number) => {
    const response = await api.post(`/Approval/submit/${documentId}`, {}, {
      params: { userId }
    });
    return response.data;
  },

  decide: async (documentId: number, decision: ApprovalDecision, decidedByUserId: number, rejectionReason?: string) => {
    const response = await api.post(`/Approval/decide/${documentId}`, {
      decision,
      decidedByUserId,
      rejectionReason
    });
    return response.data;
  },

  getPending: async (enterpriseId: number) => {
    const response = await api.get(`/Approval/pending/${enterpriseId}`);
    return response.data;
  },

  getHistory: async (documentId: number) => {
    const response = await api.get(`/Approval/history/${documentId}`);
    return response.data;
  }
};
