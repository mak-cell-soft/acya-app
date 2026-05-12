import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { BankDeposit, BankBalance } from '../../models/bank-deposit';

@Injectable({
  providedIn: 'root'
})
export class BankDepositService {
  baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  createDeposit(deposit: any): Observable<BankDeposit> {
    return this.http.post<BankDeposit>(this.baseUrl + 'BankDeposit', deposit);
  }

  getBankDeposits(bankId: number): Observable<BankDeposit[]> {
    return this.http.get<BankDeposit[]>(this.baseUrl + 'BankDeposit/bank/' + bankId);
  }

  getBankBalance(bankId: number): Observable<BankBalance> {
    return this.http.get<BankBalance>(this.baseUrl + 'BankDeposit/balance/' + bankId);
  }

  getAllBankBalances(): Observable<BankBalance[]> {
    return this.http.get<BankBalance[]>(this.baseUrl + 'BankDeposit/balances');
  }
}
