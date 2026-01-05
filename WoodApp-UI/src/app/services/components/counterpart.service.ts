import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { CounterPart } from '../../models/components/counterpart';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CounterpartService {

  /**
 * Appel de l'URL du serveur de l'application
 */
  baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  /**
* Appel de la méthode Post endpoint : CounterPart/Post du serveur avec paramètre : l'objet CounterPart.
* @param model 
* @returns 
*/
  Add(model: CounterPart) {
    return this.http.post<CounterPart>(this.baseUrl + 'CounterPart/Add', model);
  }

  /**
  * Appel de la méthode Get endpoint : CounterPart.
  * @param 
  * @returns 
  */
  // GetAll() {
  //   return this.http.get<CounterPart[]>(this.baseUrl + 'CounterPart');
  // }

  GetAll(_type: string): Observable<CounterPart[]> {
    return this.http.get<CounterPart[]>(this.baseUrl + 'CounterPart/GetAll/' + _type);  // Ensure no unexpected error throwing
  }


  /**
  * Appel de la méthode Put endpoint : CounterPart/Put du serveur avec paramètre : l'objet CounterPart.
  * @param model 
  * @returns 
  */
  Put(id: number, model: CounterPart) {
    return this.http.put<CounterPart>(this.baseUrl + 'CounterPart/' + id, model);
  }


  /**
  * Appel de la méthode Del endpoint : CounterPart/DeleteSoft du serveur
  * @param id
  * @returns 
  */
  Delete(id: number) {
    return this.http.delete(this.baseUrl + 'CounterPart/DeleteSoft/' + id);
  }

}
