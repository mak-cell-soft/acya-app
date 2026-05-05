import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BalanceEntry } from '../../models/balance-entry';
import { AuditLog } from '../../models/audit-log';

@Injectable({
    providedIn: 'root'
})
export class AdminDashService {
    baseUrl = environment.apiUrl + 'AdminDash/';

    constructor(private http: HttpClient) { }

    getCustomerBalances(): Observable<BalanceEntry[]> {
        return this.http.get<BalanceEntry[]>(this.baseUrl + 'customer-balances');
    }

    getSupplierBalances(): Observable<BalanceEntry[]> {
        return this.http.get<BalanceEntry[]>(this.baseUrl + 'supplier-balances');
    }

    refreshBalances(): Observable<void> {
        return this.http.post<void>(this.baseUrl + 'refresh-balances', {});
    }

    exportReport(type: string, format: string, filters: any): Observable<Blob> {
        let params: any = { format };
        if (filters.startDate) params.startDate = filters.startDate;
        if (filters.endDate) params.endDate = filters.endDate;
        if (filters.salesSiteId) params.salesSiteId = filters.salesSiteId;

        return this.http.get(`${environment.apiUrl}Reports/${type}/export`, {
            params,
            responseType: 'blob'
        });
    }

    getRecentAuditLogs(count: number = 50, userName?: string, date?: string): Observable<AuditLog[]> {
        let params: any = { count };
        if (userName) params.userName = userName;
        if (date) params.date = date;
        return this.http.get<AuditLog[]>(`${environment.apiUrl}Audit/recent`, { params });
    }
}
