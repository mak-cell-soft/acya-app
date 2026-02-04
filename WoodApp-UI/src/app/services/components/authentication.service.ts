import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { LoginRequest, UserAuth } from '../../models/components/Authentication/login';
import { map, Observable } from 'rxjs';
import { jwtDecode } from 'jwt-decode';

interface CustomJwtPayload {
  email: string;
  name: string;
  nameid: string;
  role: string;
  EnterpriseId: string; // Added Recently
  DefaultSite: string;
  DefaultSiteId: string;
}

@Injectable({
  providedIn: 'root'
})

export class AuthenticationService {
  /**
    * Appel de l'URL du serveur de l'application
    */
  baseUrl = environment.apiUrl;
  private tokenKey: string = 'Token';

  private userSubject = new BehaviorSubject<any>(null);
  public user$ = this.userSubject.asObservable();


  constructor(private http: HttpClient) { }

  /**
 * Appel de la méthode Post endpoint : Person/Post du serveur avec paramètre : l'objet AppUser.
 * @param model 
 * @returns 
 */
  login(model: LoginRequest): Observable<UserAuth> {
    return this.http.post<UserAuth>(this.baseUrl + 'Account/login', model).pipe(
      map((response) => {
        const { isSuccess, token } = response;
        if (isSuccess && token) {
          localStorage.setItem(this.tokenKey, token);
          this.userSubject.next(this.getUserDetail()); // Emit user details
        } else {
          console.error('Login failed or token missing');
        }
        return response;
      })
    );
  }
  // login(model: LoginRequest): Observable<UserAuth> {
  //   return this.http.post<UserAuth>(this.baseUrl + 'Account/login', model).pipe(
  //     map((response) => {
  //       const { isSuccess, token } = response;
  //       // Chec if login is successful and a token is provided
  //       if (isSuccess && token) {
  //         localStorage.setItem(this.tokenKey, token);
  //       } else {
  //         console.error('Login failed or token missing');
  //       }
  //       return response;
  //     }
  //     )
  //   );
  // }

  getRole = (): string | null => {
    const token = this.getToken();
    if (!token) return null;

    const decodedToken = jwtDecode<CustomJwtPayload>(token);
    return decodedToken.role || null;
  }

  getEnterpriseId = (): string | null => {
    const token = this.getToken();
    if (!token) return null;

    const decodedToken = jwtDecode<CustomJwtPayload>(token);
    return decodedToken.EnterpriseId || null;
  }

  getUserDetail = () => {
    const token = this.getToken();
    if (!token) return null;

    // Decode the token as a CustomJwtPayload
    const decodedToken = jwtDecode<CustomJwtPayload>(token);
    //console.log('Decoded Token', decodedToken);

    const userDetail = {
      id: decodedToken.nameid,
      fullname: decodedToken.name,
      email: decodedToken.email,
      role: decodedToken.role,
      enterpriseId: decodedToken.EnterpriseId,
      defaultSite: decodedToken.DefaultSite,
      defaultSiteId: decodedToken.DefaultSiteId
    };
    console.log('Connected User Details fullname + Default site: ', userDetail.fullname + '  ' + userDetail.defaultSite);
    return userDetail;
  }

  isLoggedIn = (): boolean => {
    const token = this.getToken();
    // console.log('Token:', token);
    // console.log('Is Token Expired:', this.isTokenExpired());

    if (!token) return false;
    return !this.isTokenExpired();
  }

  private isTokenExpired() {
    const token = this.getToken();
    if (!token) return true;
    try {
      const decoded = jwtDecode<{ exp: number }>(token);
      return Date.now() >= decoded.exp * 1000;
    } catch (error) {
      console.error('Error decoding token:', error);
      return true;
    }
  }

  getToken = (): string | null => {
    if (typeof window !== 'undefined' && window.localStorage) {
      // console.log(localStorage.getItem('Token'));
      return localStorage.getItem(this.tokenKey) || null;
    }
    return null;
  };

  // logout = (): void => {
  //   if (typeof window !== 'undefined' && window.localStorage) {
  //     localStorage.removeItem(this.tokenKey);
  //   }
  // };
  logout = (): void => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(this.tokenKey);
      this.userSubject.next(null); // Emit null when logging out
    }
  };

  // Method to manually update the user subject
  updateUserDetails(): void {
    this.userSubject.next(this.getUserDetail());
  }

}
