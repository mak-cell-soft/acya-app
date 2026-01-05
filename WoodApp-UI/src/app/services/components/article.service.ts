import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Article } from '../../models/components/article';

@Injectable({
  providedIn: 'root'
})
export class ArticleService {

  /**
   * Appel de l'URL du serveur de l'application
   */
  baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  /**
* Appel de la méthode Post endpoint : AppVariable/Post du serveur avec paramètre : l'objet AppVariable.
* @param model 
* @returns 
*/
  AddArticle(model: Article) {
    return this.http.post<Article>(this.baseUrl + 'Article/Add', model);
  }

  /**
  * Appel de la méthode Get endpoint : Article.
  * @param 
  * @returns 
  */
  GetAll() {
    return this.http.get<Article[]>(this.baseUrl + 'Article');
  }

  /**
 * Appel de la méthode Put endpoint : Category/Put du serveur avec paramètre : l'objet Article.
 * @param model 
 * @returns 
 */
  Put(id: number, model: Article) {
    return this.http.put<Article>(this.baseUrl + 'Article/' + id, model);
  }

  /**
 * Appel de la méthode Del endpoint : Article/DeleteSoft du serveur
 * @param id
 * @returns 
 */
  Delete(id: number) {
    return this.http.delete(this.baseUrl + 'Article/DeleteSoft/' + id);
  }

}
