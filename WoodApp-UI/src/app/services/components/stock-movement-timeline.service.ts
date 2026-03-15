import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StockMovementTimeline, StockMovementSummary, StockMovementReconciliation } from '../../models/components/stock-movement';
import { Site } from '../../models/components/sites';

@Injectable({
  providedIn: 'root'
})
export class StockMovementTimelineService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getTimeline(merchandiseId: number, salesSiteId: number, from?: Date, to?: Date): Observable<StockMovementTimeline[]> {
    let params = new HttpParams()
      .set('merchandiseId', merchandiseId.toString())
      .set('salesSiteId', salesSiteId.toString());
    
    if (from) params = params.set('from', from.toISOString());
    if (to) params = params.set('to', to.toISOString());

    return this.http.get<StockMovementTimeline[]>(`${this.baseUrl}StockMovement/timeline`, { params });
  }

  getTimelineByPackage(packageNumber: string, salesSiteId: number, from?: Date, to?: Date): Observable<StockMovementTimeline[]> {
    let params = new HttpParams()
      .set('packageNumber', packageNumber)
      .set('salesSiteId', salesSiteId.toString());
    
    if (from) params = params.set('from', from.toISOString());
    if (to) params = params.set('to', to.toISOString());

    return this.http.get<StockMovementTimeline[]>(`${this.baseUrl}StockMovement/timeline/by-package`, { params });
  }

  getSummary(merchandiseId: number, salesSiteId: number): Observable<StockMovementSummary> {
    const params = new HttpParams()
      .set('merchandiseId', merchandiseId.toString())
      .set('salesSiteId', salesSiteId.toString());

    return this.http.get<StockMovementSummary>(`${this.baseUrl}StockMovement/summary`, { params });
  }

  reconcile(merchandiseId: number, salesSiteId: number): Observable<StockMovementReconciliation> {
    const params = new HttpParams()
      .set('merchandiseId', merchandiseId.toString())
      .set('salesSiteId', salesSiteId.toString());

    return this.http.get<StockMovementReconciliation>(`${this.baseUrl}StockMovement/reconcile`, { params });
  }

  getSites(): Observable<Site[]> {
    return this.http.get<Site[]>(`${this.baseUrl}StockMovement/sites`);
  }
}
