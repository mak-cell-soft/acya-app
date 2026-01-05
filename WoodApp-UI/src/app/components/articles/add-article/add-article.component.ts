import { AfterViewInit, Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Category, SubCategory } from '../../../models/configuration/category';
import { CategoryService } from '../../../services/configuration/category.service';
import { AppVariableService } from '../../../services/configuration/app-variable.service';
import { AppVariable } from '../../../models/configuration/appvariable';
import { ACTIONS, CALCULATED_PRICE, CATEGORIES, CODE_ARTICLE, DATE, DESCRIPTION, GENERAL_INFORMATIONS, LENGTH, MAT_CARD_PROVIDER_PRICE, MIN_PROFIT_PERCENTAGE, MIN_QUANTITY, PRICE, PROVIDER, QUANTITY_UNIT, SALES_PRICE, THIKNESS, TVA, UNDER_CATEGORIES, WIDTH, WOOD_PROPERTIES } from '../../../shared/constants/components/article';
import { ABORT_BUTTON, ADD_BUTTON, REGISTER_BUTTON } from '../../../shared/Text_Buttons';
import { QuantityUnits } from '../../../models/configuration/dimensions';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Article } from '../../../models/components/article';
import { ArticleService } from '../../../services/components/article.service';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import { percentageValidator } from '../../../shared/validators/naturalNumberValidator';

@Component({
  selector: 'app-add-article',
  templateUrl: './add-article.component.html',
  styleUrl: './add-article.component.css'
})
export class AddArticleComponent implements OnInit, AfterViewInit {


  //#region Labels General Informations
  general_information: string = GENERAL_INFORMATIONS;
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

  register_button: string = REGISTER_BUTTON;
  abort_button: string = ABORT_BUTTON;
  add_button: string = ADD_BUTTON;
  //#endregion

  //#region Providers Price
  mat_card_provider_price: string = MAT_CARD_PROVIDER_PRICE;
  mat_header_cell_article_price_date: string = DATE;
  mat_header_cell_article_price_provider: string = PROVIDER;
  mat_header_cell_price_value: string = PRICE;
  mat_header_cell_provider_price_action: string = ACTIONS;
  //#endregion


  articlesPrices: [] = [];
  displayedArticleProviderColumns: string[] = ['date', 'provider', 'price', 'action'];


  categories: Category[] = [];
  filteredSubCategories: SubCategory[] = [];
  woodId: number = 0;

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

  quantityUnits = Object.values(QuantityUnits); // Converts enum to array of values
  quantityUnit!: QuantityUnits; // This will hold the selected value

  articleForm!: FormGroup;

  constructor(
    private categoryService: CategoryService,
    private appvarService: AppVariableService,
    private articleService: ArticleService,
    private toastr: ToastrService,
    private fb: FormBuilder,
    private router: Router
  ) { }

  onNoClick(): void {
    //this.dialogRef.close();
  }

  ngOnInit(): void {
    this.createForm();
  }


  ngAfterViewInit(): void {
    this.getAllCategories();
    this.getAllTva();
    this.getAllWidth();
    this.getAllThickness();
    this.getAllLengths();
  }

  createForm() {
    this.articleForm = this.fb.group({
      articlecode: ['', Validators.required],
      description: ['', Validators.required],
      selectedCategory: ['', Validators.required],
      selectedSubCategory: ['', Validators.required],
      selectedThikness: [''],
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
    this.articleForm.valueChanges.subscribe(() => {
      this.CalculatePriceTTC_HT();
    });
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

  // Method to calculate 'calculatedPriceHT'
  CalculatePriceTTC_HT(): void {
    const selectedPriceTTC = this.articleForm.get('selectedPriceTTC')?.value;
    const selectedTvaId = this.articleForm.get('selectedTva')?.value;

    if (selectedPriceTTC != null && selectedTvaId != null) {
      const selectedTva = this.appvariablesTVA.find(tva => tva.id === selectedTvaId);

      if (selectedTva && selectedTva.value != null) {
        const calculatedPriceHT = selectedPriceTTC / (1 + (parseFloat(selectedTva.value)) / 100);
        this.articleForm.get('calculatedPriceHT')?.setValue(calculatedPriceHT.toFixed(3), { emitEvent: false });
      }
    }
  }


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

  onCategoryChange(categoryId: number) {
    const selectedCategory = this.categories.find(category => category.id === categoryId);
    this.filteredSubCategories = selectedCategory ? selectedCategory.firstchildren : [];
    console.log("SELECTED CATEGORY = ", selectedCategory);
    this.woodId === selectedCategory!.id;
    this.selectedSubCategory = null; // Reset the selected subcategory

    // Check if woodId is 1
    if (this.woodId === 1) {
      // Auto-select m3 and make the field readonly
      this.articleForm.get('quantityUnit')?.setValue(QuantityUnits.m3);
      this.articleForm.get('quantityUnit')?.disable(); // Make it readonly
    } else {
      // Enable the field and filter out m3 from the options
      this.articleForm.get('quantityUnit')?.enable();
      this.quantityUnits = Object.values(QuantityUnits).filter(unit => unit !== QuantityUnits.m3);
    }

  }

  applyValidators(): void {
    this.articleForm.get('profitpercentage')!.setValidators([
      Validators.required,
      percentageValidator()
    ]);
  }


  onSubmit() {
    this.applyValidators();
    const article = new Article();
    if (this.articleForm.valid) {
      const formValues = this.articleForm.value;

      article.id = 0; // Assuming it will be initialized in BackEnd
      article.updatedby = 1; // Hard-coded, this should be dynamic if needed
      article.creationdate = new Date();
      article.updatedate = new Date();

      // Map the basic fields
      article.reference = formValues.articlecode;
      article.description = formValues.description;
      article.sellprice_ttc = formValues.selectedPriceTTC;
      article.sellprice_ht = formValues.calculatedPriceHT;
      article.minquantity = formValues.minquantity;
      article.profitmarginpercentage = formValues.profitpercentage;

      article.unit = this.articleForm.get('quantityUnit')?.value.substring(0, 3);

      // console.log("Article unit set to: ", article.unit);
      article.lengths = this.selectedLengths || null;
      article.lastpurchaseprice_ttc = 0;

      // Map related entities (category, thickness, width, tva)
      article.categoryid = this.categories.find(category => category.id === formValues.selectedCategory)?.id || 0;
      article.subcategoryid = this.filteredSubCategories.find(subcategory => subcategory.id === formValues.selectedSubCategory)?.id || 0;
      article.thicknessid = this.appvariablesThikness.find(thickness => thickness.id === formValues.selectedThikness)?.id || null;
      article.widthid = this.appvariablesWidth.find(width => width.id === formValues.selectedWidth)?.id || null;
      article.tvaid = this.appvariablesTVA.find(tva => tva.id === formValues.selectedTva)?.id || 0;

      // Set related entities to null for now
      article.category = null;
      article.subcategory = null;
      article.thickness = null;
      article.width = null;
      article.tva = null;

      // Determine if it's a wood product
      article.iswood = this.woodId === 1;

      // Now send the article object
      this.addArticle(article);
    } else {
      this.toastr.warning("Valider les champs de saisie d\'abord !");
    }
  }

  addArticle(article: Article): void {
    if (article) {
      console.log("ARTICLE TO SEND : ", article);
      this.articleService.AddArticle(article).subscribe({
        next: (response) => {
          this.toastr.success('Successfully added article: ' + response.reference);
          this.router.navigateByUrl('home/articles');
        },
        error: (error) => {
          if (error.status === 409) {
            // Conflict Error: Article already exists
            this.toastr.error('Error: Article with this reference already exists.');
          } else if (error.status === 400) {
            // Bad Request: General failure when adding the article
            this.toastr.error('Error: Failed to add the article.');
          } else if (error.status === 404) {
            // Not Found: Failure to add price history
            this.toastr.error('Error: Failed to add sell price history.');
          } else {
            // Generic error handler for other cases
            this.toastr.error('An unexpected error occurred. Please try again later.');
          }

          // Log the error for debugging
          console.error('Error adding Article', error);
        }
      });
    } else {
      this.toastr.warning('Warning: Article is missing.');
    }
  }

  getAllLengths() {
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

}
