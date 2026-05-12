import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { CaisseMovement, CaisseBalance } from '../../models/caisse';

@Injectable({
  providedIn: 'root'
})
export class CaisseService {
  baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getSiteBalance(siteId: number): Observable<CaisseBalance> {
    return this.http.get<CaisseBalance>(this.baseUrl + 'Caisse/site/' + siteId);
  }

  getAllBalances(): Observable<CaisseBalance[]> {
    return this.http.get<CaisseBalance[]>(this.baseUrl + 'Caisse/all');
  }

  addMovement(movement: any): Observable<CaisseMovement> {
    return this.http.post<CaisseMovement>(this.baseUrl + 'Caisse/movement', movement);
  }

  getMovements(siteId: number, count: number = 100, date?: Date): Observable<CaisseMovement[]> {
    let url = this.baseUrl + 'Caisse/movements/' + siteId + '?count=' + count;
    if (date) {
      // Format as YYYY-MM-DD so the backend can parse it without timezone ambiguity
      const iso = date.toISOString().split('T')[0];
      url += '&date=' + iso;
    }
    return this.http.get<CaisseMovement[]>(url);
  }

  /** Plafond restant pour l'approvisionnement manuel du jour */
  getApproLimit(siteId: number): Observable<{ especeTotal: number; alreadyIn: number; remaining: number }> {
    return this.http.get<any>(this.baseUrl + 'Caisse/appro-limit/' + siteId);
  }

  /** Hard delete d'un mouvement manuel (Appro/Remise). Refusé par le backend si PaymentId != null */
  deleteMovement(id: number): Observable<void> {
    return this.http.delete<void>(this.baseUrl + 'Caisse/movement/' + id);
  }
}
