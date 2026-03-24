import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Vehicle } from '../../models/components/vehicle';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class VehicleService {
  private baseUrl = `${environment.apiUrl}Vehicle`;

  constructor(private http: HttpClient) { }

  getAll(): Observable<Vehicle[]> {
    return this.http.get<Vehicle[]>(this.baseUrl);
  }

  get(id: number): Observable<Vehicle> {
    return this.http.get<Vehicle>(`${this.baseUrl}/${id}`);
  }

  add(vehicle: Vehicle): Observable<Vehicle> {
    return this.http.post<Vehicle>(`${this.baseUrl}/Add`, vehicle);
  }

  update(vehicle: Vehicle): Observable<Vehicle> {
    return this.http.put<Vehicle>(`${this.baseUrl}/Update`, vehicle);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
