import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Provider } from '../../models/components/provider';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProviderService {

  /**
   * Appel de l'URL du serveur de l'application
   */
  baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  /**
* Appel de la méthode Post endpoint : Provider/Post du serveur avec paramètre : l'objet Provider.
* @param model 
* @returns 
*/
  AddProvider(model: Provider) {
    return this.http.post<Provider>(this.baseUrl + 'Provider/Add', model);
  }

  /**
  * Appel de la méthode Get endpoint : Provider.
  * @param 
  * @returns 
  */
  // GetAll() {
  //   return this.http.get<Provider[]>(this.baseUrl + 'Provider');
  // }

  GetAll(): Observable<Provider[]> {
    return this.http.get<Provider[]>(this.baseUrl + 'Provider');  // Ensure no unexpected error throwing
  }


  /**
 * Appel de la méthode Put endpoint : Provider/Put du serveur avec paramètre : l'objet Provider.
 * @param model 
 * @returns 
 */
  Put(id: number, model: Provider) {
    return this.http.put<Provider>(this.baseUrl + 'Provider/' + id, model);
  }


  /**
  * Appel de la méthode Del endpoint : Provider/DeleteSoft du serveur
  * @param id
  * @returns 
  */
  Delete(id: number) {
    return this.http.delete(this.baseUrl + 'Provider/DeleteSoft/' + id);
  }
}
