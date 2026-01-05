import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Transporter } from '../../models/components/customer';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TransporterService {
  http = inject(HttpClient);

  /**
     * Appel de l'URL du serveur de l'application
     */
  baseUrl = environment.apiUrl;

  /**
* Appel de la méthode Post endpoint : Transporter/Post du serveur avec paramètre : l'objet Transporter.
* @param model 
* @returns 
*/
  Add(model: Transporter) {
    return this.http.post<Transporter>(this.baseUrl + 'Transporter/Add', model);
  }

  getAll(): Observable<Transporter[]> {
    return this.http.get<Transporter[]>(this.baseUrl + 'Transporter');
  }
}
