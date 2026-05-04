import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ImportError {
  rowIndex: number;
  message: string;
}

export interface ImportReport {
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: ImportError[];
}

@Injectable({
  providedIn: 'root'
})
export class ImportService {
  baseUrl = environment.apiUrl + 'Imports/';

  constructor(private http: HttpClient) { }

  importArticles(file: File, userId: string, enterpriseId: string): Observable<ImportReport> {
    const formData = new FormData();
    formData.append('file', file);

    const params = new HttpParams()
      .set('userId', userId)
      .set('enterpriseId', enterpriseId);

    return this.http.post<ImportReport>(this.baseUrl + 'articles', formData, { params });
  }

  importCounterParts(file: File, type: string, userId: string, enterpriseId: string): Observable<ImportReport> {
    const formData = new FormData();
    formData.append('file', file);

    const params = new HttpParams()
      .set('type', type)
      .set('userId', userId)
      .set('enterpriseId', enterpriseId);

    return this.http.post<ImportReport>(this.baseUrl + 'counterparts', formData, { params });
  }
}
