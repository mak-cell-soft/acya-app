import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { SubCategory } from '../../models/configuration/category';

@Injectable({
  providedIn: 'root'
})
export class SubCategoryService {

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
    * Appel de la méthode Mise à jour Put du serveur avec paramètre l'objet SubCategory et l'id de la sous catégorie à modifier
    * @param model 
    * @param id
    * @returns 
    */
  Put(id: number, model: SubCategory) {
    return this.http.put<SubCategory>(this.baseUrl + 'FirstChild/' + id, model);
  }


}
