import { Injectable } from '@angular/core';
import { Customer } from '../../models/components/customer';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CustomerService {

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
  AddProvider(model: Customer) {
    return this.http.post<Customer>(this.baseUrl + 'Provider/Add', model);
  }

  /**
  * Appel de la méthode Get endpoint : Provider.
  * @param 
  * @returns 
  */
  // GetAll() {
  //   return this.http.get<Provider[]>(this.baseUrl + 'Provider');
  // }

  GetAll(): Observable<Customer[]> {
    return this.http.get<Customer[]>(this.baseUrl + 'Provider');  // Ensure no unexpected error throwing
  }


  /**
 * Appel de la méthode Put endpoint : Provider/Put du serveur avec paramètre : l'objet Provider.
 * @param model 
 * @returns 
 */
  Put(id: number, model: Customer) {
    return this.http.put<Customer>(this.baseUrl + 'Provider/' + id, model);
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
