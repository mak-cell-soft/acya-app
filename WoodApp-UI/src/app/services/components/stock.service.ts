import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { Stock, StockQuantity, StockWithLengthDetails, WoodParams } from '../../models/components/stock';
import { Site } from '../../models/components/sites';
import { ConfirmTransferResponse, StockTransferDetails, StockTransferInfo, StockTransfert } from '../../models/components/stock_transfert';
import { AuthenticationService } from './authentication.service';

@Injectable({
  providedIn: 'root'
})
export class StockService {

  http = inject(HttpClient);
  authService = inject(AuthenticationService);

  /**
     * Appel de l'URL du serveur de l'application
     */
  baseUrl = environment.apiUrl;

  /**
  * Appel de la méthode GetAll endpoint : Stock/GetAll du serveur
  * @param 
  * @returns 
  */
  getAll(): Observable<Stock[]> {
    return this.http.get<Stock[]>(this.baseUrl + 'Stock');
  }

  /**
* Appel de la méthode GetAll endpoint : Stock/GetAll du serveur
* @param 
* @returns 
*/
  getBySite(model: Site): Observable<StockQuantity[]> {
    return this.http.post<StockQuantity[]>(this.baseUrl + 'Stock/GetBySite', model);
  }

  /**
   * 
   * @param id 
   * @returns 
   */
  getStockById(id: number): Observable<Stock> {
    return this.http.get<Stock>(this.baseUrl + 'Stock/' + id);
  }

  /**
   * 
   * @param model
   * @returns 
   */

  createTransaction(model: Stock): Observable<void> {
    return this.http.post<void>(this.baseUrl + 'Stock/transactions', model);
  }

  /**
   * 
   * @param id 
   * @param model 
   * @returns 
   */
  updateStock(id: number, model: Stock): Observable<void> {
    return this.http.put<void>(this.baseUrl + 'Stock/' + id, model);
  }

  /**
  * 
  * @param id 
  * @param model 
  * @returns 
  */
  transferStock(model: StockTransfert): Observable<any> {
    return this.http.post<any>(this.baseUrl + 'Stock/process-transfer', model);
  }

  getStockTransfers(): Observable<StockTransferInfo[]> {
    return this.http.get<StockTransferInfo[]>(this.baseUrl + 'Stock/transfers/infos');
  }

  getStockTransferDetails(originDoc?: string, receiptDoc?: string): Observable<StockTransferDetails[]> {
    let params = new HttpParams();

    if (originDoc) {
      params = params.append('originDoc', originDoc);
    }

    if (receiptDoc) {
      params = params.append('receiptDoc', receiptDoc);
    }

    return this.http.get<StockTransferDetails[]>(this.baseUrl + 'Stock/transfers/details', { params });
  }

  // confirmTransfer(transferId: number, comment: string) {
  //   const userId = this.authService.getUserDetail()?.id;
  //   return this.http.post(`${this.baseUrl}Stock/confirm-transfer/${transferId}`, {
  //     confirmedByUserId: userId,
  //     comment
  //   });
  // }

  confirmTransfer(transferId: number, comment: string): Observable<ConfirmTransferResponse> {
    const userId = this.authService.getUserDetail()?.id;
    return this.http.post<ConfirmTransferResponse>(
      `${this.baseUrl}Stock/confirm-transfer/${transferId}`,
      {
        confirmedByUserId: userId,
        comment
      }
    );
  }

  rejectTransfer(transferId: number, comment: string) {
    const userId = this.authService.getUserDetail()?.id;
    return this.http.post(`${this.baseUrl}Stock/reject-transfer/${transferId}`, {
      rejectedByUserId: userId,
      comment
    });
  }

  /**
   * Get wood stock with length details for a specific merchandise and sales site.
   * @param WoodParams 
   * @returns Observable of StockWithLengthDetails[]
   */
  getWoodStockWithLengthDetails(woodParams: WoodParams): Observable<StockWithLengthDetails[]> {
    // changed: use POST and send woodParams in the request body (backend expects [FromBody] WoodParamsDto)
    return this.http.post<StockWithLengthDetails[]>(
      this.baseUrl + 'Stock/wood/details',
      woodParams
    );
  }

}
