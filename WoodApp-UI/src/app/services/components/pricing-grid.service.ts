import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PricingGrid, PricingGridLookup } from '../../models/components/pricing-grid';

@Injectable({
  providedIn: 'root'
})
export class PricingGridService {
  private apiUrl = `${environment.apiUrl}PricingGrid`;

  constructor(private http: HttpClient) { }

  getForCounterPart(counterPartId: number): Observable<PricingGrid[]> {
    return this.http.get<PricingGrid[]>(`${this.apiUrl}/${counterPartId}`);
  }

  getLookup(counterPartId: number): Observable<PricingGridLookup[]> {
    return this.http.get<PricingGridLookup[]>(`${this.apiUrl}/${counterPartId}/lookup`);
  }

  create(grid: PricingGrid): Observable<PricingGrid> {
    return this.http.post<PricingGrid>(this.apiUrl, grid);
  }

  update(id: number, grid: PricingGrid): Observable<PricingGrid> {
    return this.http.put<PricingGrid>(`${this.apiUrl}/${id}`, grid);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
