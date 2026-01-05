import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Site } from '../../models/components/sites';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SalessitesService {

  http = inject(HttpClient);

  /**
     * Appel de l'URL du serveur de l'application
     */
  baseUrl = environment.apiUrl;

  /**
   * Appel de la méthode Post endpoint : Site/Post du serveur avec paramètre : l'objet Enterprise.
   * @param model 
   * @returns 
   */
  Add(model: Site) {
    return this.http.post<Site>(this.baseUrl + 'SalesSites/add', model);
  }

  /**
    * Appel de la méthode Get endpoint : SalesSites.
    * @param 
    * @returns 
    */
    // GetAll() {
    //   return this.http.get<SalesSites[]>(this.baseUrl + 'SalesSites');
    // }
  
    GetAll(): Observable<Site[]> {
      return this.http.get<Site[]>(this.baseUrl + 'SalesSites');  // Ensure no unexpected error throwing
    }
}
