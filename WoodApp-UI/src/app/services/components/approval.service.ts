import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

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
  approverRoles: string | null;
}

export interface DocumentApproval {
  id: number;
  documentId: number;
  document?: any;
  submittedByUserId: number;
  submittedBy?: any;
  decidedByUserId?: number;
  decidedBy?: any;
  decision: ApprovalDecision;
  rejectionReason: string | null;
  submittedAt: string;
  decidedAt: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ApprovalService {
  private apiUrl = `${environment.apiUrl}Approval`;

  constructor(private http: HttpClient) { }

  getConfig(enterpriseId: number): Observable<ApprovalConfig> {
    return this.http.get<ApprovalConfig>(`${this.apiUrl}/config/${enterpriseId}`);
  }

  saveConfig(config: ApprovalConfig): Observable<ApprovalConfig> {
    return this.http.put<ApprovalConfig>(`${this.apiUrl}/config`, config);
  }

  submit(documentId: number, userId: number): Observable<DocumentApproval> {
    return this.http.post<DocumentApproval>(`${this.apiUrl}/submit/${documentId}?userId=${userId}`, {});
  }

  decide(documentId: number, decision: ApprovalDecision, decidedByUserId: number, rejectionReason?: string): Observable<DocumentApproval> {
    return this.http.post<DocumentApproval>(`${this.apiUrl}/decide/${documentId}`, {
      decision,
      decidedByUserId,
      rejectionReason
    });
  }

  getPending(enterpriseId: number): Observable<DocumentApproval[]> {
    return this.http.get<DocumentApproval[]>(`${this.apiUrl}/pending/${enterpriseId}`);
  }

  getHistory(documentId: number): Observable<DocumentApproval[]> {
    return this.http.get<DocumentApproval[]>(`${this.apiUrl}/history/${documentId}`);
  }
}
