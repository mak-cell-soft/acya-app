import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LeaveService {
  private baseUrl = environment.apiUrl + 'Leave';

  constructor(private http: HttpClient) { }

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(this.baseUrl);
  }

  getByEmployee(employeeId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/Employee/${employeeId}`);
  }

  add(leave: any): Observable<any> {
    return this.http.post<any>(this.baseUrl, leave);
  }

  update(id: number, leave: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, leave);
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`);
  }
}
