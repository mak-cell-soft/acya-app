import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { AppUser } from '../../models/components/appuser';
import { ProfileUpdate, PasswordUpdate } from '../../models/components/Authentication/profile-management';
import { UserAuth } from '../../models/components/Authentication/login';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AccountService {

  /**
     * Appel de l'URL du serveur de l'application
     */
  baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  /**
 * Appel de la méthode Post endpoint : AppUser/Post du serveur avec paramètre : l'objet AppUser.
 * @param model 
 * @returns 
 */
  RegisterEmployee(model: AppUser): Observable<UserAuth> {
    return this.http.post<UserAuth>(this.baseUrl + 'Account/register', model);
  }

  getProfile(id: number): Observable<AppUser> {
    return this.http.get<AppUser>(this.baseUrl + 'Account/profile/' + id);
  }

  updateProfile(model: ProfileUpdate): Observable<any> {
    return this.http.put(this.baseUrl + 'Account/update-profile', model);
  }

  updatePassword(model: PasswordUpdate): Observable<any> {
    return this.http.put(this.baseUrl + 'Account/update-password', model);
  }
}
