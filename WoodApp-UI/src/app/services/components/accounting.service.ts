import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AccountStatement } from '../../models/components/ledger';

@Injectable({
    providedIn: 'root'
})
export class AccountingService {
    baseUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    getBalance(counterpartId: number): Observable<number> {
        return this.http.get<number>(`${this.baseUrl}Accounting/balance/${counterpartId}`);
    }

    getStatement(counterpartId: number, startDate: Date, endDate: Date): Observable<AccountStatement> {
        let params = new HttpParams()
            .set('startDate', startDate.toISOString())
            .set('endDate', endDate.toISOString());

        return this.http.get<AccountStatement>(`${this.baseUrl}Accounting/statement/${counterpartId}`, { params });
    }
}
