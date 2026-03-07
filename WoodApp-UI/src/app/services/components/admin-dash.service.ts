import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BalanceEntry } from '../../models/balance-entry';

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
}
