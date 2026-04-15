import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { HoldingTaxe } from '../../models/components/holdingtax';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HoldingTaxService {

  http = inject(HttpClient);

  /**
   * Base URL of the API from configuration
   */
  apiUrl = environment.apiUrl;

  applyToDocument(documentId: number, dto: HoldingTaxe): Observable<any> {
    return this.http.post(`${this.apiUrl}HoldingTax/apply-to-document/${documentId}`, dto);
  }

  removeFromDocument(documentId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}HoldingTax/remove-from-document/${documentId}`);
  }
}
