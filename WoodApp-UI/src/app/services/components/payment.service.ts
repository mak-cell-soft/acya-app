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
     * Update an existing Payment (amount, date, method, reference, notes)
     * Calls PUT /Payments/{id} → UpdatePaymentDto on the backend.
     */
    Update(id: number, model: Partial<Payment> & { paymentId: number }): Observable<any> {
        return this.http.put<any>(`${this.baseUrl}Payments/${id}`, model);
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
    GetDashboardPayments(date: Date, appUserId?: number, documentSide?: string): Observable<DashboardPaymentDto[]> {
        // Use local date components to avoid timezone shifts from toISOString()
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        let params = new HttpParams().set('date', dateStr);
        if (appUserId) {
            params = params.set('appuserid', appUserId.toString());
        }
        if (documentSide) {
            params = params.set('documentSide', documentSide);
        }
        return this.http.get<DashboardPaymentDto[]>(this.baseUrl + 'Payments/dashboard', { params });
    }

    /**
     * Links an existing payment (originally against a delivery note) to the newly created invoice.
     * DocumentId on the payment row is updated to reference the invoice instead of the delivery note.
     * Called after delivery-note → invoice conversion when isService === false.
     */
    LinkToInvoice(paymentId: number, invoiceId: number): Observable<void> {
        console.log("In service LinkToInvoice paymentId", paymentId);
        console.log("In service LinkToInvoice invoiceId", invoiceId);
        return this.http.patch<void>(
            `${this.baseUrl}Payments/${paymentId}/link-invoice/${invoiceId}`,
            {}
        );
    }

    GetBySupplierId(supplierId: number): Observable<Payment[]> {
        return this.http.get<Payment[]>(`${this.baseUrl}Payments/supplier/${supplierId}`);
    }

    GetTraitesBySupplierId(supplierId: number): Observable<Payment[]> {
        return this.http.get<Payment[]>(`${this.baseUrl}Payments/supplier/${supplierId}/traites`);
    }

    GetEcheances(fromDate: Date, toDate: Date): Observable<any[]> {
        // Use local date components to avoid timezone shifts and 400 Bad Request (formatting)
        const format = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        let params = new HttpParams()
            .set('fromDate', format(fromDate))
            .set('toDate', format(toDate));
        return this.http.get<any[]>(`${this.baseUrl}Payments/echeances`, { params });
    }

    MarkTraiteAsPaid(instrumentId: number, model: { paidAtBankDate: Date, notes?: string }): Observable<void> {
        return this.http.patch<void>(`${this.baseUrl}Payments/instruments/${instrumentId}/mark-paid`, model);
    }
}
