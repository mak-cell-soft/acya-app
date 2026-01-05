import { AfterViewInit, ChangeDetectorRef, Component, inject, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { AddArticleComponent } from '../add-article/add-article.component';
import { ArticleService } from '../../../services/components/article.service';
import { Article } from '../../../models/components/article';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ARTICLE_CODE, ARTICLE_DESCRIPTION, CALCULATED_PRICE, CATEGORIES, CODE_ARTICLE, DESCRIPTION, EDIT_ARTICLE, GENERAL_INFORMATIONS, LENGTH, MIN_PROFIT_PERCENTAGE, MIN_QUANTITY, PRICE, QUANTITY_UNIT, SALES_PRICE, THIKNESS, TVA, UNDER_CATEGORIES, WIDTH, WOOD_PROPERTIES } from '../../../shared/constants/components/article';
import { ABORT_BUTTON, ADD_BUTTON, REGISTER_BUTTON, UPDATE_BUTTON } from '../../../shared/Text_Buttons';
import { QuantityUnits } from '../../../models/configuration/dimensions';
import { Category, SubCategory } from '../../../models/configuration/category';
import { CategoryService } from '../../../services/configuration/category.service';
import { AppVariableService } from '../../../services/configuration/app-variable.service';
import { ToastrService } from 'ngx-toastr';
import { AppVariable } from '../../../models/configuration/appvariable';
import { Store } from '@ngrx/store';
import * as ArticleActions from '../../../store/actions/article.actions';
import * as fromArticle from '../../../store/selectors/article.selector';
import { ConfirmDeleteModalComponent } from '../../../dashboard/modals/confirm-delete-modal/confirm-delete-modal.component';

/**
 * @class ArticleListComponent
 * @description This component displays a list of articles in a table format with search, add, edit, and delete functionality.
 * 
 * @example
 * <app-article-list></app-article-list>
 * 
 * @property {MatTableDataSource<Article>} allArticles - Data source for the article table
 * @property {boolean} loading - Indicates whether data is being loaded
 * @property {string[]} displayedArticlesColumns - Columns to be displayed in the table
 * @property {FormGroup} selectedArticleForm - Form group for editing selected article
 * 
 * @method applyFilter(event: Event) - Filters the table based on user input
 * @method editArticle(element: Article) - Initiates editing for a selected article
 * @method deleteArticle(element: Article) - Deletes a selected article
 * @method saveArticle() - Saves changes to an edited article
 */


@Component({
  selector: 'app-list-article',
  templateUrl: './list-article.component.html',
  styleUrl: './list-article.component.css',
  animations: [
    trigger('detailExpand', [
      state('collapsed,void', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ]
})
export class ListArticleComponent implements AfterViewInit {

  dialog = inject(MatDialog);
  //#region Labels General Informations

  article_code: string = ARTICLE_CODE;
  article_description: string = ARTICLE_DESCRIPTION;

  edit_article: string = EDIT_ARTICLE;
  code_article: string = CODE_ARTICLE;
  description_label: string = DESCRIPTION;

  categories_label: string = CATEGORIES;
  under_categories_label: string = UNDER_CATEGORIES;

  wood_properties_label: string = WOOD_PROPERTIES;
  thikness_label: string = THIKNESS;
  width_label: string = WIDTH;
  legth_label: string = LENGTH;

  sales_price_label: string = SALES_PRICE;
  price_label: string = PRICE;
  tva_label: string = TVA;
  calculated_price_label: string = CALCULATED_PRICE;
  quantity_unit: string = QUANTITY_UNIT;
  min_quantity: string = MIN_QUANTITY;
  min_profit_percentage: string = MIN_PROFIT_PERCENTAGE;

  update_button: string = UPDATE_BUTTON;
  abort_button: string = ABORT_BUTTON;
  add_button: string = ADD_BUTTON;
  //#endregion

  //#region Declarations
  loading: boolean = false; // Track loading state
  isArticleToEdit: boolean = false;
  selectedArticle!: Article | null;
  woodId: number = 0;
  isQuantityUnitDisabled: boolean = false;

  allArticles: MatTableDataSource<Article> = new MatTableDataSource<Article>();
  displayedArticlesColumns: string[] = ['reference', 'description', 'category', 'subcategory', 'sellprice_ttc', 'tva', 'sellprice_ht', 'creationdate', 'action'];

  columnsToDisplayWithExpand = [...this.displayedArticlesColumns, 'expand'];
  expandedElement: Article | null = null;

  calculatedPriceHT: number | null = null;
  selectedSubCategory: number | null = null;

  appvariablesTVA: AppVariable[] = [];
  selectedTva: AppVariable | null = null;

  appvariablesWidth: AppVariable[] = [];
  selectedWidth: AppVariable | null = null;

  appvariablesThikness: AppVariable[] = [];
  selectedThikness: AppVariable | null = null;

  appvariablesLength: AppVariable[] = [];
  selectedLengths: string = '';
  // Keep track of selected length names
  selectedLengthNames: string[] = [];

  selectedArticleForm!: FormGroup;
  quantityUnits = Object.values(QuantityUnits); // Converts enum to array of values
  quantityUnit!: QuantityUnits; // This will hold the selected value
  categories: Category[] = [];
  filteredSubCategories: SubCategory[] = [];
  //#endregion

  @ViewChild(MatPaginator) paginatorArticles!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private categoryService: CategoryService,
    private appvarService: AppVariableService,
    private toastr: ToastrService,
    private fb: FormBuilder,
    private matDialog: MatDialog,
    private articleService: ArticleService
  ) { }

  ngAfterViewInit() {
    this.allArticles.paginator = this.paginatorArticles;
    this.allArticles.sort = this.sort;
    this.getAllArticles();
    this.getAllCategories();
    this.getAllThickness();
    this.getAllWidth();
    this.getAllTva();
    this.getAllLength();
  }

  editArticle(article: Article): void {
    this.isArticleToEdit = true;
    this.selectedArticle = article;

    // Test if the expanded element is Wood to display width, thickness and lengths
    if (this.expandedElement?.categoryid === 1) {
      this.woodId === 1;
    }

    // Loop through all articles and set editing to false except for the selected one
    this.allArticles.data.forEach(art => {
      art.editing = (art.id === article.id); // Only the selected article will have editing = true
    });

    // Create or reset the form
    this.createForm();

    // if article is Wood Dimensions config
    var _thickness!: any;
    var _width!: any;
    if (article.iswood) {
      this.woodId === 1;
      _thickness = article.thickness?.id;
      _width = article.width?.id;
      this.initializeLengths(article);
    } else {
      _thickness = null;
      _width = null;
    }

    // Patch the form with the selected article's values
    this.selectedArticleForm.patchValue({
      articlecode: article.reference,
      description: article.description,
      selectedCategory: article.category?.id || '',
      selectedSubCategory: this.onCategoryChange(article.category?.id || 1),
      selectedThickness: _thickness,
      selectedWidth: _width,
      // selectedPriceTTC: this.selectedArticle.sellprice_ttc ? this.selectedArticle.sellprice_ttc.toFixed(3) : '0.000',
      selectedPriceTTC: this.selectedArticle.sellprice_ttc && !isNaN(Number(this.selectedArticle.sellprice_ttc))
        ? Number(this.selectedArticle.sellprice_ttc).toFixed(3)
        : '0.000',

      selectedTva: article.tvaid,
      quantityUnit: Object.values(QuantityUnits).find(unit => unit.startsWith(article.unit?.substring(0, 3))),
      calculatedPriceHT: article.sellprice_ht,
      minquantity: article.minquantity,
      profitpercentage: article.profitmarginpercentage
    });

    // Manually trigger category change to update subcategories
    this.onCategoryChange(article.category?.id ?? 0);

    // After the subcategory list is updated, patch the selected subcategory value
    this.selectedArticleForm.patchValue({
      selectedSubCategory: article.subcategory?.id || ''
    });

  }

  // Method to calculate 'calculatedPriceHT'
  CalculatePriceTTC_HT(): void {
    const selectedPriceTTC = this.selectedArticleForm.get('selectedPriceTTC')?.value;
    const selectedTvaId = this.selectedArticleForm.get('selectedTva')?.value;

    if (selectedPriceTTC != null && selectedTvaId != null) {
      const selectedTva = this.appvariablesTVA.find(tva => tva.id === selectedTvaId);

      if (selectedTva && selectedTva.value != null) {
        const calculatedPriceHT = selectedPriceTTC / (1 + (parseFloat(selectedTva.value)) / 100);
        this.selectedArticleForm.get('calculatedPriceHT')?.setValue(calculatedPriceHT.toFixed(3), { emitEvent: false });
      }
    }
  }

  confirmBeforeSaveEdit(article: Article): Article | null {
    if (article != null) {
      // Check if the article is a wood item but the unit is not 'M3'
      let _u = this.selectedArticleForm.get('quantityUnit')?.value;
      if (article.iswood && _u !== QuantityUnits.m3) {
        this.toastr.warning("Unit does not match the selected category.");
        return null; // Exit early and stop the procedure
      }

      // Rest of the mapping logic
      if (this.selectedArticleForm.valid) {
        const formValues = this.selectedArticleForm.value;
        article.id = this.selectedArticle!.id || 0;
        article.updatedby = 1; // Example hard-coded user, should be dynamic

        // Map article fields from the form
        article.reference = formValues.articlecode;
        article.description = formValues.description;
        article.sellprice_ttc = formValues.selectedPriceTTC;
        article.sellprice_ht = formValues.calculatedPriceHT;
        article.minquantity = formValues.minquantity;
        article.profitmarginpercentage = formValues.profitpercentage;
        article.updatedate = new Date();

        article.unit = this.selectedArticleForm.get('quantityUnit')?.value.substring(0, 3);
        article.lengths = this.selectedLengths || null;
        article.lastpurchaseprice_ttc = 0;

        // Map related entities
        article.categoryid = this.categories.find(category => category.id === formValues.selectedCategory)?.id || 0;
        article.subcategoryid = this.filteredSubCategories.find(subcategory => subcategory.id === formValues.selectedSubCategory)?.id || 0;
        article.thicknessid = this.appvariablesThikness.find(thickness => thickness.id === formValues.selectedThickness)?.id || null;
        article.widthid = this.appvariablesWidth.find(width => width.id === formValues.selectedWidth)?.id || null;
        article.tvaid = this.appvariablesTVA.find(tva => tva.id === formValues.selectedTva)?.id || 0;

        // Check if it's a wood product
        article.iswood = this.woodId === 1;
      }
      console.log("Article Updated Sended : " + article);
      return article; // Return the valid article
    }
    return null;
  }

  saveArticle(): void {
    let article = this.selectedArticle as Article;
    let _article = this.confirmBeforeSaveEdit(article);

    if (!_article) {
      // Exit if the article validation failed (i.e., if _article is null)
      return;
    }



    // Dispatch the updateArticle action with the article data
    // this.store.dispatch(ArticleActions.updateArticle({ id: article.id, article: _article }));

    this.articleService.Put(article.id, _article).subscribe({
      next: (response) => {
        console.log("Updated Article RESPONSE : ", response);
        this.toastr.success(response.reference, 'Mis à jour');
        this.getAllArticles();
      },
      error: (error) => {
        console.error('Error Updating Articles:', error);
        const errorMessage = error.error?.message || 'Erreure lors de la mise à jour'; // Default message if no specific error message
        this.toastr.warning(errorMessage, 'Erreur');
        this.getAllArticles();
      }
    });


    // Reset the selectedArticle and editing states
    this.isArticleToEdit = false;
    this.selectedArticle = null;
  }

  cancelEditArticle(article: Article) {
    this.isArticleToEdit = false;
    this.selectedArticle = null;

    // Create a new object with editing set to false
    this.allArticles.data = this.allArticles.data.map(art =>
      art.id === article.id ? { ...art, editing: false } : art
    );
  }

  cancelEditArticleButton() {
    this.isArticleToEdit = false;
    this.selectedArticle = null;
  }

  deleteArticle(article: Article) {
    const item = { id: article.id, name: article.reference };
    const dialogRef = this.dialog.open(ConfirmDeleteModalComponent, {
      width: '400px',
      data: { item }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        console.log('Item deleted:', item);
        this.articleService.Delete(article.id).subscribe({
          next: () => {
            this.allArticles.data = this.allArticles.data.filter(p => p.id !== article.id);
            this.toastr.success('Article deleted successfully');
          },
          error: () => this.toastr.error('Error deleting Article')
        });
      } else {
        console.log('Deletion canceled');
        this.toastr.info("Suppression annulé");
      }
    });

  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.allArticles.filter = filterValue.trim().toLowerCase();

    if (this.paginatorArticles) {
      this.paginatorArticles.firstPage();
    }
  }

  OpenDialogAddArticle() {
    const dialogRef = this.matDialog.open(AddArticleComponent, {
      width: '800px'
    });
    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      // Handle the result here
    });
  }

  createForm() {
    this.selectedArticleForm = this.fb.group({
      articlecode: ['', Validators.required],
      description: ['', Validators.required],
      selectedCategory: ['', Validators.required],
      selectedSubCategory: ['', Validators.required],
      selectedThickness: [''],
      selectedWidth: [''],
      selectedLengths: [''],
      selectedPriceTTC: ['', Validators.required],
      selectedTva: ['', Validators.required],
      calculatedPriceHT: [{ value: '' }],
      quantityUnit: ['', Validators.required],
      minquantity: ['', Validators.required],
      profitpercentage: ['']
    });

    // Call the method whenever 'selectedPriceTTC' or 'selectedTva' changes
    this.selectedArticleForm.valueChanges.subscribe(() => {
      this.CalculatePriceTTC_HT();
    });
  }

  onCategoryChange(categoryId: number) {
    const selectedCategory = this.categories.find(category => category.id === categoryId);
    this.filteredSubCategories = selectedCategory ? selectedCategory.firstchildren : [];
    console.log("SELECTED CATEGORY = ", selectedCategory);

    // Set woodId
    this.woodId = selectedCategory ? selectedCategory.id : 0;
    this.selectedSubCategory = null; // Reset the selected subcategory

    // Check if woodId is 1
    if (this.woodId === 1) {
      // Auto-select m3, make it readonly, and disable the select
      this.quantityUnits = Object.values(QuantityUnits);
      this.selectedArticleForm.get('quantityUnit')?.setValue(QuantityUnits.m3);
      this.isQuantityUnitDisabled = false;  // Enable the <mat-select>
    } else {
      // Enable the field and filter out m3 from the options
      this.selectedArticleForm.get('quantityUnit')?.enable();
      this.quantityUnits = Object.values(QuantityUnits).filter(unit => unit !== QuantityUnits.m3);
      this.isQuantityUnitDisabled = false;  // Enable the <mat-select>
    }
  }

  isLengthSelected(length: string): boolean {
    return this.selectedLengthNames.includes(length);
  }

  onLengthSelectionChange(event: any, length: string): void {
    if (event.checked) {
      this.selectedLengthNames.push(length);
    } else {
      this.selectedLengthNames = this.selectedLengthNames.filter(item => item !== length);
    }

    // Update selectedLengths string with the format [3.3, 3.6, 5.4]
    this.selectedLengths = `[${this.selectedLengthNames.join(', ')}]`;
    console.log("SELECTED LENGTHS : ", this.selectedLengths);
  }

  initializeLengths(article: any): void {
    if (article.lengths && typeof article.lengths === 'string') {
      // Remove the brackets and split the string by ',' to get individual lengths
      this.selectedLengthNames = article.lengths
        .replace('[', '')  // Remove starting bracket
        .replace(']', '')  // Remove ending bracket
        .split(',')        // Split by comma
        .map((length: string) => length.trim());  // Trim spaces around each length
    } else {
      // If no lengths or incorrect format, initialize as empty array
      this.selectedLengthNames = [];
    }

    // Update the formatted string for display (optional)
    this.selectedLengths = this.selectedLengthNames.join(', ');
    // console.log("===============  Initialized Lengths: ", this.selectedLengths);  // This should now print just the lengths
    // console.log("===============  Initialized Lengths: ", this.appvariablesLength);  // This should now print just the lengths
  }

  //#region Get All Data for filtering
  /**
  * On récupère toutes les Categories du BackEnd
  */
  getAllCategories() {
    this.categoryService.GetAll().subscribe({
      next: (response) => {
        this.categories = response.map(category => ({
          ...category,
          firstchildren: category.firstchildren || []
        }));
      },
      error: (error) => {
        console.error('Error fetching categories:', error);
        // Optionally display an error message
      }
    });
  }

  getAllArticles() {
    this.loading = true; // Start loading
    this.allArticles.data = [];
    this.articleService.GetAll().subscribe({
      next: (response) => {
        console.log("getAllArticles() Method RESPONSE : ", response);
        this.allArticles.data = response;
        this.loading = false; // Stop loading after data is fetched
        this.allArticles.data = [...this.allArticles.data]; // Trigger change detection
        console.log("getAllArticles() Method : ", this.allArticles.data);
      },
      error: (error) => {
        console.error('Error fetching Articles:', error);
        this.loading = false; // Stop loading on error
      }
    });
  }

  getAllTva() {
    this.appvarService.GetAll('Tva').subscribe({
      next: (response: AppVariable[]) => {
        this.appvariablesTVA = response
        console.log("getAllTva() Method : ", this.appvariablesTVA);
      },
      // error: (error) => {
      //   //console.error('Error fetching categories:', error);
      //   this.toastr.error(this.load_taxes_error);
      // }
    });
  }

  getAllWidth() {
    this.appvarService.GetAll('width').subscribe({
      next: (response: AppVariable[]) => {
        // Sort the response array by the 'value' property in descending order
        response.sort((a, b) => parseFloat(b.name) - parseFloat(a.name));
        console.log('PARSING AND SORTING RESPONSE WIDTH', response);
        this.appvariablesWidth = response;
        console.log("getAllWIDTH() Method : ", this.appvariablesWidth);
      },
      // error: (error) => {
      //   //console.error('Error fetching categories:', error);
      //   this.toastr.error(this.load_taxes_error);
      // }
    });
  }

  getAllThickness() {
    this.appvarService.GetAll('thickness').subscribe({
      next: (response: AppVariable[]) => {
        // Sort the response array by the 'value' property in descending order
        response.sort((a, b) => parseFloat(b.name) - parseFloat(a.name));
        this.appvariablesThikness = response;
        console.log("getAllTHICKNESS() Method : ", this.appvariablesThikness);
      },
      // error: (error) => {
      //   //console.error('Error fetching categories:', error);
      //   this.toastr.error(this.load_taxes_error);
      // }
    });
  }

  getAllLength() {
    this.appvarService.GetAll('Length').subscribe({
      next: (response: AppVariable[]) => {
        // Sort the response array by the 'value' property in descending order
        response.sort((a, b) => parseFloat(b.value) - parseFloat(a.value));

        this.appvariablesLength = response
        //this.toastr.success(this.load_tva_success);
      },
      // error: (error) => {
      //   //console.error('Error fetching categories:', error);
      //   this.toastr.error(this.load_taxes_error);
      // }
    });
  }
  //#endregion
}

