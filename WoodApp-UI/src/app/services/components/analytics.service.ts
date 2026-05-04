import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardKpi } from '../../models/analytics';

@Injectable({
    providedIn: 'root'
})
export class AnalyticsService {
    baseUrl = environment.apiUrl + 'Analytics/';

    constructor(private http: HttpClient) { }

    /**
     * Retrieves aggregated dashboard KPIs.
     * @param enterpriseId Optional enterprise filter.
     */
    getDashboardKpis(enterpriseId?: string): Observable<DashboardKpi> {
        let params = new HttpParams();
        if (enterpriseId) {
            params = params.set('enterpriseId', enterpriseId);
        }
        return this.http.get<DashboardKpi>(this.baseUrl + 'dashboard', { params });
    }
}
