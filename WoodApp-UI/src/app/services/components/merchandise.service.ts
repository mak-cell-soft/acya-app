import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MerchandiseService {

  /**
         * Appel de l'URL du serveur de l'application
         */
  baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  /**
   * Appel de la méthode HttpGet endpoint : Person/Get du serveur sans paramètres.
   * @param model 
   * @returns 
   */
  getMerchandiseReferenceAsString(_id: number): Observable<string> {
    return this.http.get(`${this.baseUrl}Merchandise/getref/${_id}`, { responseType: 'text' });
  }
}
