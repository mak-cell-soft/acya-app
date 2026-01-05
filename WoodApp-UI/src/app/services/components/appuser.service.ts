import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { AppUser } from '../../models/components/appuser';
import { Observable } from 'rxjs';
import { Site } from '../../models/components/sites';

@Injectable({
  providedIn: 'root'
})
export class AppuserService {
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
  GetAll() {
    return this.http.get<AppUser[]>(this.baseUrl + 'AppUser');
  }

  /**
 * Appel de la méthode Put endpoint : Account/Put du serveur avec paramètre : l'objet AppUser.
 * @param model 
 * @returns 
 */
  Put(id: number, model: AppUser) {
    return this.http.put<AppUser>(this.baseUrl + 'AppUser/' + id, model);
  }


  /**
  * Appel de la méthode Del endpoint : Account/DeleteSoft du serveur
  * @param id
  * @returns 
  */
  Delete(id: number) {
    return this.http.delete(this.baseUrl + 'AppUser/DeleteSoft/' + id);
  }

  /**
  * Appel de la méthode Del endpoint : Account/DeleteSoft du serveur
  * @param id
  * @returns 
  */
  GetById(id: number) {
    return this.http.get<AppUser>(this.baseUrl + 'AppUser/' + id);
  }

  /**
  * Appel de la méthode Del endpoint : Account/DeleteSoft du serveur
  * @param id
  * @returns 
  */
  /**
   * Issue of the commented method : 
   * The issue with your original GetSalesSite method is that it does not explicitly specify the responseType option. 
   * Angular's HttpClient defaults to expecting JSON responses. When your API returns plain text, Angular tries to parse it as JSON, 
   * leading to a SyntaxError.
   * 
   */
  GetSalesSite(_id: number) {
    return this.http.get<Site>(this.baseUrl + 'AppUser/getsite/' + _id);
  }

  getConnectedUserSalesSiteAsString(id: number): Observable<string> {
    return this.http.get(`${this.baseUrl}AppUser/getstringsite/${id}`, { responseType: 'text' });
  }


}
