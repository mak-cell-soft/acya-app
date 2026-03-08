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
  allThicknesses: AppVariable[] = [];
  allWidths: AppVariable[] = [];

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
    console.log('Thickness object:', this.article_inputdata.thickness);
    console.log('Width object:', this.article_inputdata.width);
    console.log('Merchand a voir : merchand_inputdata', this.merchand_inputdata);
    console.log('Stock restant: availableStock_inputdata', this.availableStock_inputdata);
    this.createForm();

    // Load variable lists as fallbacks
    this.appvarService.GetAll('thickness').subscribe(res => this.allThicknesses = res);
    this.appvarService.GetAll('width').subscribe(res => {
      this.allWidths = res;
      this.patchFormValues(); // Re-patch once we have fallbacks
    });

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
    // Get values safely - with fallbacks to finding objects by ID in pre-loaded lists
    let thicknessObj = this.article_inputdata.thickness;
    if (!thicknessObj && this.article_inputdata.thicknessid) {
      thicknessObj = this.allThicknesses.find(t => t.id === this.article_inputdata.thicknessid);
    }

    let widthObj = this.article_inputdata.width;
    if (!widthObj && this.article_inputdata.widthid) {
      widthObj = this.allWidths.find(w => w.id === this.article_inputdata.widthid);
    }

    const thickness = thicknessObj?.value || thicknessObj?.name || '';
    const width = widthObj?.value || widthObj?.name || '';

    console.log('Patching thickness:', thickness, 'using ID fallback:', !!(!thicknessObj && this.article_inputdata.thicknessid));
    console.log('Patching width:', width, 'using ID fallback:', !!(!widthObj && this.article_inputdata.widthid));

    this.lengthsForm.patchValue({
      thickness: thickness,
      width: width,
    });

    // Trigger recalculation if already initialized
    if (this.lengths && this.lengths.length > 0) {
      this.lengths.forEach(l => this.updateQuantity(l));
    }
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
    let rawLengths: string = selectedArticle.lengths ?? '';

    // Strip surrounding brackets if present: "[240, 270, 300]" -> "240, 270, 300"
    rawLengths = rawLengths.trim().replace(/^\[|\]$/g, '');

    const lengthsArray = rawLengths
      .split(',')
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);

    console.log('Lengths array parsed:', lengthsArray);

    return this.appvarService.GetAll('Length').pipe(
      map((response: AppVariable[]) => {
        return response
          .filter(appVar => lengthsArray.includes(appVar.name))
          .sort((a, b) => parseFloat(b.value) - parseFloat(a.value));
      }),
      catchError((err) => {
        console.error('Failed to fetch lengths', err);
        return of([]);
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

      // If we have existing lengths (editing mode), populate the pieces
      if (this.data.lengths && Array.isArray(this.data.lengths)) {
        const existing = this.data.lengths.find((l: ListOfLength) => l.length.id === filteredItem.id);
        if (existing) {
          listOfLength.nbpieces = existing.nbpieces;
          // We'll recalculate quantity below
        }
      }

      return listOfLength;
    });

    console.log('Initialized lengths:', this.lengths);

    // Update availablePieces based on stock data
    if (this.availableStock_inputdata && Array.isArray(this.availableStock_inputdata)) {
      this.lengths.forEach(listOfLength => {
        const matchingStock = this.availableStock_inputdata.find(
          (stock: StockItem) => stock.lengthName === listOfLength.length.name
        );

        if (matchingStock) {
          listOfLength.availablePieces = matchingStock.remainingPieces;
        }
      });
    }

    // Recalculate all quantities and total
    this.totalQuantity = 0;
    this.lengths.forEach(l => {
      this.updateQuantity(l);
    });
    console.log('Final lengths with totals:', this.lengths);
    console.log('Calculated Total Quantity:', this.totalQuantity);
  }


  /**
   * Calcule la quantité de chaque Longueur de l'article
   * selon le nombre de pièces saisie.
   * @param element ListOfLength
   */
  updateQuantity(element: ListOfLength): void {
    // Parse thickness and width values - ensuring they are strings before replace
    const rawThickness = this.lengthsForm.get('thickness')?.value?.toString() || '0';
    const rawWidth = this.lengthsForm.get('width')?.value?.toString() || '0';

    const thicknessValue = parseFloat(rawThickness.replace(',', '.')) || 0;
    const widthValue = parseFloat(rawWidth.replace(',', '.')) || 0;

    const rawLen = element.length.value?.toString() || '0';
    const lengthValue = parseFloat(rawLen.replace(',', '.')) || 0;

    // Calculate the quantity for the current element
    element.quantity = (element.nbpieces || 0) * lengthValue * thicknessValue * widthValue;

    // Recalculate the total quantity
    this.totalQuantity = this.lengths.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }










}
