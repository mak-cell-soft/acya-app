import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { AppVariable } from '../../models/configuration/appvariable';

@Injectable({
  providedIn: 'root'
})
export class AppVariableService {

  /**
   * Appel de l'URL du serveur de l'application
   */
  baseUrl = environment.apiUrl;

  /**
   * Constructeur: besoin d'initialiser la classe avec HttpClient pour les appels client-serveur.
   * client-serveur : application cliente angular et api c# Wood App.
   * @param http 
   */
  constructor(private http: HttpClient) { }

  /**
 * Appel de la méthode Post endpoint : AppVariable/Post du serveur avec paramètre : l'objet AppVariable.
 * @param model 
 * @returns 
 */
  AddAppVariable(model: AppVariable) {
    return this.http.post<AppVariable>(this.baseUrl + 'AppVariable/Add', model);
  }

  /**
  * Appel de la méthode Post endpoint : AppVariable/Post du serveur avec paramètre : l'objet AppVariable.
  * @param model 
  * @returns 
  */
  Put(id: number, model: AppVariable) {
    return this.http.put<AppVariable>(this.baseUrl + 'AppVariable/' + id, model);
  }

  /**
  * Appel de la méthode Post endpoint : AppVariable/Post du serveur avec paramètre : l'objet AppVariable.
  * @param model 
  * @returns 
  */
  GetAll(nature: string) {
    return this.http.get<AppVariable[]>(this.baseUrl + 'AppVariable/getall/' + nature);
  }
}
