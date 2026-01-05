import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Enterprise } from '../../models/components/enterprise';

@Injectable({
  providedIn: 'root'
})
export class EnterpriseService {

  http = inject(HttpClient);

  /**
     * Appel de l'URL du serveur de l'application
     */
  baseUrl = environment.apiUrl;

  /**
 * Appel de la méthode Post endpoint : Enterprise/Post du serveur avec paramètre : l'objet Enterprise.
 * @param model 
 * @returns 
 */
  Register(model: Enterprise) {
    return this.http.post<Enterprise>(this.baseUrl + 'Enterprise/register', model);
  }


  /**
   * 
   * 
   */
  getEnterpriseInfo(id: number) {
    return this.http.get<Enterprise>(this.baseUrl + 'Enterprise/getbyid/' + id);
  }
}
