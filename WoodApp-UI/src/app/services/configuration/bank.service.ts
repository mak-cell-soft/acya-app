import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Bank } from '../../models/configuration/bank';

@Injectable({
  providedIn: 'root'
})
export class BankService {

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
  * Appel de la méthode Post endpoint : Category/Post du serveur avec paramètre : l'objet Category.
  * @param model 
  * @returns 
  */
  AddBank(model: Bank) {
    return this.http.post<Bank>(this.baseUrl + 'Bank/Add', model);
  }

  /**
  * Appel de la méthode Post endpoint : Category/Post du serveur avec paramètre : l'objet Category.
  * @param model 
  * @returns 
  */
  Put(id: number, model: Bank) {
    return this.http.put<Bank>(this.baseUrl + 'Bank/' + id, model);
  }

  /**
  * Appel de la méthode Get endpoint : Bank.
  * @param 
  * @returns 
  */
  GetAll() {
    return this.http.get<Bank[]>(this.baseUrl + 'Bank');
  }

}
