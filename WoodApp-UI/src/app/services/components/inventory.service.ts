import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { Document } from '../../models/components/document';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  baseUrl = environment.apiUrl + 'Inventory';

  constructor(private http: HttpClient) { }

  getAll(): Observable<Document[]> {
    return this.http.get<Document[]>(this.baseUrl);
  }

  add(model: Document): Observable<{ docRef: string, message: string }> {
    return this.http.post<{ docRef: string, message: string }>(this.baseUrl, model);
  }

  validate(id: number): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.baseUrl}/${id}/validate`, {});
  }
}
