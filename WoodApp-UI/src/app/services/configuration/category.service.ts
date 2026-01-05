import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Category } from '../../models/configuration/category';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {

  /**
   * Appel de l'URL du serveur de l'application
   */
  baseUrl = environment.apiUrl;

  /**
   * Manage the signals and updates.
   */
  private categorySubject = new BehaviorSubject<Category | null>(null);
  category$ = this.categorySubject.asObservable();


  /**
   * For Signal Service
   * @param category 
   */
  updateCategory(category: Category) {
    this.categorySubject.next(category);
  }

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
  AddCategory(model: Category) {
    return this.http.post<Category>(this.baseUrl + 'Category/Add', model);
  }

  /**
  * Appel de la méthode Post endpoint : Category/Post du serveur avec paramètre : l'objet Category.
  * @param model 
  * @returns 
  */
  Put(id: number, model: Category) {
    return this.http.put<Category>(this.baseUrl + 'Category/' + id, model);
  }

  /**
  * Appel de la méthode Post endpoint : Category/Post du serveur avec paramètre : l'objet Category.
  * @param model 
  * @returns 
  */
  GetAll() {
    return this.http.get<Category[]>(this.baseUrl + 'Category');
  }

}
