import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Document, DocumentTypes, typeDocsToFilter } from '../../models/components/document';
import { Observable } from 'rxjs';
import { GenerateInvoice } from '../../models/components/generate_invoice';
import { DocumentsRelationship } from '../../models/components/documentsrelationship';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {

  /**
     * Appel de l'URL du serveur de l'application
     */
  baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  /**
* Appel de la méthode Post endpoint : Document/Post du serveur avec paramètre : l'objet Document.
* @param model 
* @returns 
*/
  // Add(model: Document) {
  //   return this.http.post<Document>(this.baseUrl + 'Document/', model);
  // }

  Add(model: Document): Observable<{ docRef: string, message: string }> {
    return this.http.post<{ docRef: string, message: string }>(this.baseUrl + 'Document/', model);
  }

  /**
   * Appel de la méthode Get endpoint : Document.
   * @param 
   * @returns 
   */
  GetAll(): Observable<Document[]> {
    return this.http.get<Document[]>(this.baseUrl + 'Document');  // Ensure no unexpected error throwing
  }

  /**
  * Appel de la méthode Get endpoint : Document.
  * @param 
  * @returns 
  */
  GetByType(_type: DocumentTypes): Observable<Document[]> {
    const params = new HttpParams().set('_type', _type.toString());
    return this.http.get<Document[]>(this.baseUrl + 'Document/_type', { params });
  }

  /**
  * Appel de la méthode Get endpoint : Document.
  * @param 
  * @returns 
  */
  // GetByTypeDocsFiltered(_typefiltered: typeDocsToFilter): Observable<Document[]> {
  //   const params = new HttpParams().set('_typefiltered', _typefiltered.toString());
  //   return this.http.get<Document[]>(this.baseUrl + 'Document/_typefiltered', { params });
  // }

  GetByTypeDocsFiltered(model: typeDocsToFilter): Observable<Document[]> {
    return this.http.post<Document[]>(this.baseUrl + 'Document/_typefiltered', model);
  }


  /**
  * Appel de la méthode Del endpoint : Document/DeleteSoft du serveur
  * @param id
  * @returns 
  */
  Delete(id: number) {
    return this.http.delete(this.baseUrl + 'Document/DeleteSoft/' + id);
  }


  /**
   * invoiceToGenerate : the target Document with some informations like Type
   * docChlidrenIds : Ids of children Documents to store the relation and calculate some Costs
   * 
   */
  CreateInvoice(model: GenerateInvoice) {
    return this.http.post(this.baseUrl + 'Document/createinvoice', model);
  }

  /**
   * invoiceToGenerate : the target Document with some informations like Type
   * docChlidrenIds : Ids of children Documents to store the relation and calculate some Costs
   * 
   */
  GetParentsWithChildren(): Observable<DocumentsRelationship[]> {
    return this.http.get<DocumentsRelationship[]>(this.baseUrl + 'Document/ParentsWithChildren');
  }
}
