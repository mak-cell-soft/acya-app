import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Payment, DashboardPaymentDto } from '../../models/components/payment';
import { Observable } from 'rxjs';
import { HttpParams } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class PaymentService {

    baseUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    /**
     * Add a new Payment
     */
    Add(model: Payment): Observable<any> {
        return this.http.post<any>(this.baseUrl + 'Payments', model);
    }

    /**
     * Get all Payments
     */
    GetAll(): Observable<Payment[]> {
        return this.http.get<Payment[]>(this.baseUrl + 'Payments');
    }

    /**
     * Get Payments by Document ID
     */
    GetByDocumentId(documentId: number): Observable<Payment[]> {
        return this.http.get<Payment[]>(this.baseUrl + 'Payments/document/' + documentId);
    }

    /**
     * Delete a Payment (Soft delete)
     */
    Delete(id: number): Observable<any> {
        return this.http.delete(this.baseUrl + 'Payments/' + id);
    }

    /**
     * Get Payments for Dashboard
     */
    GetDashboardPayments(date: Date, appUserId?: number): Observable<DashboardPaymentDto[]> {
        // Use local date components to avoid timezone shifts from toISOString()
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        let params = new HttpParams().set('date', dateStr);
        if (appUserId) {
            params = params.set('appuserid', appUserId.toString());
        }
        return this.http.get<DashboardPaymentDto[]>(this.baseUrl + 'Payments/dashboard', { params });
    }
}
