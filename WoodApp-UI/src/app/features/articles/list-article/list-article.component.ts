import { AfterViewInit, ChangeDetectorRef, Component, inject, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { AddArticleComponent } from '../add-article/add-article.component';
import { ArticleHistoryComponent } from '../article-history/article-history.component';
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
import { ConfirmDeleteModalComponent } from '../../../shared/components/modals/confirm-delete-modal/confirm-delete-modal.component';

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
  general_informations_label: string = GENERAL_INFORMATIONS;
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

  // Filter properties
  categoryFilterValue: number | null = null;
  subcategoryFilterValue: number | null = null;
  searchFilterValue: string = '';
  filteredSubCategoriesForFilter: SubCategory[] = [];
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
    this.setFilterPredicate(); // Setup multi-column filter
    this.getAllArticles();
    this.getAllCategories();
    this.getAllThickness();
    this.getAllWidth();
    this.getAllTva();
    this.getAllLength();
  }

  setFilterPredicate() {
    this.allArticles.filterPredicate = (data: Article, filter: string) => {
      const searchTerms = JSON.parse(filter);

      const searchStr = `${data.reference} ${data.description}`.toLowerCase();
      const matchSearch = searchStr.includes(searchTerms.search.toLowerCase());

      const matchCategory = searchTerms.category ? data.categoryid === searchTerms.category : true;
      const matchSubCategory = searchTerms.subcategory ? data.subcategoryid === searchTerms.subcategory : true;

      return matchSearch && matchCategory && matchSubCategory;
    };
  }

  triggerFilter() {
    const filterObject = {
      search: this.searchFilterValue,
      category: this.categoryFilterValue,
      subcategory: this.subcategoryFilterValue
    };
    this.allArticles.filter = JSON.stringify(filterObject);

    if (this.paginatorArticles) {
      this.paginatorArticles.firstPage();
    }
  }

  onCategoryFilterChange(categoryId: any) {
    this.categoryFilterValue = categoryId;
    this.subcategoryFilterValue = null; // Reset subcat when cat changes

    if (categoryId) {
      const selected = this.categories.find(c => c.id === categoryId);
      this.filteredSubCategoriesForFilter = selected ? selected.firstchildren : [];
    } else {
      this.filteredSubCategoriesForFilter = [];
    }

    this.triggerFilter();
  }

  onSubCategoryFilterChange(subCategoryId: any) {
    this.subcategoryFilterValue = subCategoryId;
    this.triggerFilter();
  }

  OpenDialogAddArticle(article?: Article): void {
    const dialogRef = this.dialog.open(AddArticleComponent, {
      width: '1000px',
      maxWidth: '95vw',
      data: article ? { article: article } : null
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.getAllArticles();
      }
    });
  }

  editArticle(element: Article) {
    this.OpenDialogAddArticle(element);
  }

  deleteArticle(article: Article) {
    const item = { id: article.id, name: article.reference };
    const dialogRef = this.dialog.open(ConfirmDeleteModalComponent, {
      width: '400px',
      data: { item }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.articleService.Delete(article.id).subscribe({
          next: () => {
            this.allArticles.data = this.allArticles.data.filter(p => p.id !== article.id);
            this.toastr.success('Article supprimé avec succès');
          },
          error: () => this.toastr.error('Erreur lors de la suppression')
        });
      }
    });
  }

  openHistoryModal(article: Article) {
    this.dialog.open(ArticleHistoryComponent, {
      width: '900px',
      maxWidth: '95vw',
      data: {
        articleId: article.id,
        articleReference: article.reference,
        articleDescription: article.description,
        articleTvaValue: article.tva?.value
      }
    });
  }

  applyFilter(event: Event) {
    this.searchFilterValue = (event.target as HTMLInputElement).value;
    this.triggerFilter();
  }

  resetFilters() {
    this.searchFilterValue = '';
    this.categoryFilterValue = null;
    this.subcategoryFilterValue = null;
    this.filteredSubCategoriesForFilter = [];
    this.triggerFilter();
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

  /**
   * Smoothly scrolls back to the top of the collection list or the top of the viewport.
   */
  scrollToTop(): void {
    const listHeader = document.getElementById('list-header');
    if (listHeader) {
      listHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}

