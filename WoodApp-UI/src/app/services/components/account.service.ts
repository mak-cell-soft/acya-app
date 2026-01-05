import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { AppUser } from '../../models/components/appuser';

@Injectable({
  providedIn: 'root'
})
export class AccountService {

  /**
     * Appel de l'URL du serveur de l'application
     */
  baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  /**
 * Appel de la méthode Post endpoint : AppUser/Post du serveur avec paramètre : l'objet AppUser.
 * @param model 
 * @returns 
 */
  RegisterEmployee(model: AppUser) {
    return this.http.post<AppUser>(this.baseUrl + 'Account/register', model);
  }
}
