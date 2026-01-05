import { Component, inject, Inject, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ABORT_BUTTON, REGISTER_BUTTON } from '../../../shared/Text_Buttons';
import { ListOfLength } from '../../../models/components/listoflength';
import { AppVariable } from '../../../models/configuration/appvariable';
import { AppVariableService } from '../../../services/configuration/app-variable.service';
import { catchError, map, Observable, of } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

export class ReturnObject {
  _lengths: ListOfLength[] = [];
  _totalQuantity: number = 0;
}

interface StockItem {
  lengthId: number;
  lengthName: string;
  remainingPieces: number;
}

@Component({
  selector: 'app-add-lengths-modal',
  templateUrl: './add-lengths-modal.component.html',
  styleUrl: './add-lengths-modal.component.css'
})
export class AddLengthsModalComponent implements OnInit {

  fb = inject(FormBuilder);
  fb1 = inject(FormBuilder);
  dialogRef = inject(MatDialogRef<AddLengthsModalComponent>);
  appvarService = inject(AppVariableService);
  toastr = inject(ToastrService);

  /**
   * Element recues de Parent
   * inputdata : Doc Achat et Vente
   * availableStock : Doc Vente
   * merchand: Doc Vente
   */
  article_inputdata: any | null;
  availableStock_inputdata: any | null;
  merchand_inputdata: any | null;

  lengths: ListOfLength[] = [];
  totalQuantity: number = 0;


  filteredLengths!: AppVariable[];
  // displayedLengthsColumns: string[] = ['number', 'nbpieces', 'length', 'quantity'];
  // Add the available column so it appears in the table
  displayedLengthsColumns: string[] = ['number', 'nbpieces', 'length', 'quantity', 'available'];

  /**
   * Mettre le Stock Disponible comme Expand
   */
  AvailableStockExpand: string[] = [...this.displayedLengthsColumns, 'available'];
  ExpandedElement: ListOfLength | null = null;

  /**
   * Prévoir pour la liste des Longueurs en input une méthode back-end qui retourne la liste objets AppVariable
   * qui la corresponde.
   */

  register_button: string = REGISTER_BUTTON;
  abort_button: string = ABORT_BUTTON;

  lengthsForm!: FormGroup;
  tableForm!: FormGroup;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) { }

  //#region ngOnInit
  ngOnInit(): void {
    // Récupérer l'objet Article du Parent
    this.article_inputdata = this.data.article;
    // Récupérer l'objet Merchand du Parent
    this.merchand_inputdata = this.data.merchand;
    // Récupérer l'objet Stock Disponible du Parent
    this.availableStock_inputdata = this.data.availableStock;

    console.log('Article a voir : article_inputdata', this.article_inputdata);
    console.log('Merchand a voir : merchand_inputdata', this.merchand_inputdata);
    console.log('Stock restant: availableStock_inputdata', this.availableStock_inputdata);
    this.createForm();
    this.patchFormValues();
    // La liste de tous le Longueurs de la base
    this.getAll().subscribe(filteredVariables => {
      this.filteredLengths = filteredVariables;
      console.log('FITERED : ', this.filteredLengths);

      // Initialize table after filtered lengths are set
      this.initializeTableData();
    });
    this.createTableForm();
  }
  //#endregion


  //#region Form Thickness and width
  createForm() {
    this.lengthsForm = this.fb.group({
      thickness: [''],
      width: [''],
    });
  }

  patchFormValues() {
    this.lengthsForm.patchValue({
      thickness: this.article_inputdata.thickness.value || '',
      width: this.article_inputdata.width.value || '',
    });
  }
  //#endregion

  //#region Form table lengths details
  createTableForm() {
    this.tableForm = this.fb1.group({
      number: [''],
      nbpieces: [''], // Initialize with default value
      length: [''],
      quantity: ['']  // Update this dynamically
    });
  }
  //#endregion




  onAbort() {
    this.dialogRef.close();
  }

  onSubmit() {
    if (this.lengths.length > 0 && this.totalQuantity > 0) {
      console.log('PRINT LEGTHS JUST BEFORE CLOSE : ', this.lengths)
      this.dialogRef.close({ lengths: this.lengths, totalQuantity: this.totalQuantity });
    } else {
      this.toastr.error("Please ensure all fields are filled correctly.");
    }
  }

  /**
   * Transformer la liste des longueurs de l'article selectionné en un Tableau
   * Retourner tous les AppVariable type Length.
   * Construire une liste des AppVariables uniquement avec les Longueurs de l'Article selectionné. 
   * 
   * @return {Observable<AppVariable[]>}
   */
  getAll(): Observable<AppVariable[]> {
    let selectedArticle = this.article_inputdata;
    const lengths = selectedArticle.lengths ?? ""; // Ensure lengths is not null or undefined
    console.log('Les Longueurs de larticle : ', lengths);

    const lengthsArray = lengths.split(", ").map((length: string) => length.trim());
    console.log('Les Longueurs transformé en un tableau : ', lengthsArray);

    return this.appvarService.GetAll('Length').pipe(
      map((response: AppVariable[]) => {
        console.log('RESPONSE', response);
        // Filter and sort the response array
        return response
          .filter(appVar => lengthsArray.includes(appVar.name))
          .sort((a, b) => parseFloat(b.value) - parseFloat(a.value));
      }),
      catchError((err) => {
        console.error('Failed to fetch lengths', err);
        return of([]); // Return an empty array in case of error
      })
    );
  }

  /**
   * Initiliser le Tableau avec la liste des longueurs Filtrés
   * (en se basant sur les longueurs de l'Article selectionné)
   */
  initializeTableData() {
    // First initialize with defaults
    this.lengths = this.filteredLengths.map((filteredItem: AppVariable) => {
      const listOfLength = new ListOfLength();
      listOfLength.length = filteredItem;
      listOfLength.nbpieces = 0;
      listOfLength.quantity = 0;
      listOfLength.availablePieces = 0;
      return listOfLength;
    });

    console.log('Initialized lengths (defaults):', this.lengths);
    console.log('Available stock input data (raw):', this.availableStock_inputdata);
    // Then update availablePieces based on stock data
    this.lengths.forEach(listOfLength => {
      const matchingStock = this.availableStock_inputdata.find(
        (stock: StockItem) => stock.lengthName === listOfLength.length.name
      );

      if (matchingStock) {
        listOfLength.availablePieces = matchingStock.remainingPieces;
      }
    });

    console.log('Final lengths with available stock:', this.lengths);
  }


  /**
   * Calcule la quantité de chaque Longueur de l'article
   * selon le nombre de pièces saisie.
   * @param element ListOfLength
   */
  updateQuantity(element: ListOfLength): void {
    // Parse thickness and width values
    const thicknessValue = parseFloat(this.lengthsForm.get('thickness')?.value.replace(',', '.') || '0');
    const widthValue = parseFloat(this.lengthsForm.get('width')?.value.replace(',', '.') || '0');

    // Calculate the quantity for the current element
    element.quantity =
      element.nbpieces *
      parseFloat(element.length.value.replace(',', '.') || '0') *
      thicknessValue *
      widthValue;

    // Recalculate the total quantity
    /**
     * Uses Array.prototype.reduce() to iterate through the lengths array and calculate the total quantity by summing up all the quantity values.
     */
    this.totalQuantity = this.lengths.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }










}
