import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, of } from 'rxjs';
import { Currency } from '../../models/components/exchange-rate';

@Injectable({
  providedIn: 'root'
})
export class ExchangeRateService {
  private apiUrl = `${environment.apiUrl}/ExchangeRate`;

  constructor(private http: HttpClient) { }

  getExchangeRate(from: string, to: string): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}?from=${from}&to=${to}`);
  }

  // Predefined list of common currencies
  getCurrencies(): Observable<Currency[]> {
    const list: Currency[] = [
      { code: 'TND', name: 'Dinar Tunisien', symbol: 'DT' },
      { code: 'EUR', name: 'Euro', symbol: '€' },
      { code: 'USD', name: 'US Dollar', symbol: '$' },
      { code: 'GBP', name: 'British Pound', symbol: '£' }
    ];
    return of(list);
  }
}
