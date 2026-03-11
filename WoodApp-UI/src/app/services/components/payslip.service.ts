import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PayslipService {
  private baseUrl = environment.apiUrl + 'Payslip';

  constructor(private http: HttpClient) { }

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(this.baseUrl);
  }

  getByEmployee(employeeId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/Employee/${employeeId}`);
  }

  generate(payslip: any): Observable<any> {
    return this.http.post<any>(this.baseUrl, payslip);
  }

  downloadPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/Download/${id}`, { responseType: 'blob' });
  }
}
