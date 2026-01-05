import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Person } from '../../models/components/appuser';

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  /**
    * Appel de l'URL du serveur de l'application
    */
  baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  /**
 * Appel de la méthode Post endpoint : Person/Post du serveur avec paramètre : l'objet AppUser.
 * @param model 
 * @returns 
 */
  AddEmployee(model: Person) {
    return this.http.post<Person>(this.baseUrl + 'Person/Add', model);
  }

  /**
 * Appel de la méthode HttpGet endpoint : Person/Get du serveur sans paramètres.
 * @param model 
 * @returns 
 */
  GetAll() {
    return this.http.get<Person[]>(this.baseUrl + 'Person');
  }

  /**
 * Appel de la méthode Put endpoint : Person/Put du serveur avec paramètre : l'objet Person.
 * @param model 
 * @returns 
 */
  Put(id: number, model: Person) {
    return this.http.put<Person>(this.baseUrl + 'Person/' + id, model);
  }


  /**
  * Appel de la méthode Del endpoint : Person/DeleteSoft du serveur
  * @param id
  * @returns 
  */
  Delete(id: number) {
    return this.http.delete(this.baseUrl + 'Person/DeleteSoft/' + id);
  }
}
