import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdvanceService {
  private baseUrl = environment.apiUrl + 'Advance';

  constructor(private http: HttpClient) { }

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(this.baseUrl);
  }

  getByEmployee(employeeId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/Employee/${employeeId}`);
  }

  add(advance: any): Observable<any> {
    return this.http.post<any>(this.baseUrl, advance);
  }

  update(id: number, advance: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, advance);
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`);
  }
}
