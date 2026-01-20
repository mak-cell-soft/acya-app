import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Payment } from '../../models/components/payment';
import { Observable } from 'rxjs';

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
}
