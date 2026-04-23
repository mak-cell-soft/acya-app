import { AfterViewInit, Component, Inject, OnInit, Optional } from '@angular/core';
import { forkJoin } from 'rxjs';

import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
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
  isEditMode: boolean = false;

  constructor(
    @Optional() public dialogRef: MatDialogRef<AddArticleComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: { article: Article },
    private categoryService: CategoryService,
    private appvarService: AppVariableService,
    private articleService: ArticleService,
    private toastr: ToastrService,
    private fb: FormBuilder,
    private router: Router
  ) {
    if (this.data && this.data.article) {
      this.isEditMode = true;
    }
  }

  onNoClick(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }

  ngOnInit(): void {
    this.createForm();
    this.loadInitialData();
  }

  loadInitialData() {
    forkJoin({
      categories: this.categoryService.GetAll(),
      tvas: this.appvarService.GetAll('Tva'),
      widths: this.appvarService.GetAll('width'),
      thicknesses: this.appvarService.GetAll('thickness'),
      lengths: this.appvarService.GetAll('Length')
    }).subscribe({
      next: (results) => {
        // Process categories
        this.categories = results.categories.map(category => ({
          ...category,
          firstchildren: category.firstchildren || []
        }));

        // Process TVAs
        this.appvariablesTVA = results.tvas;

        // Process Widths
        results.widths.sort((a: any, b: any) => parseFloat(b.name) - parseFloat(a.name));
        this.appvariablesWidth = results.widths;

        // Process Thicknesses
        results.thicknesses.sort((a: any, b: any) => parseFloat(b.name) - parseFloat(a.name));
        this.appvariablesThikness = results.thicknesses;

        // Process Lengths
        results.lengths.sort((a: any, b: any) => parseFloat(b.value) - parseFloat(a.value));
        this.appvariablesLength = results.lengths;

        if (this.isEditMode) {
          this.patchForm();
        }
      },
      error: (error) => {
        console.error('Error loading initial data:', error);
        this.toastr.error('Erreur lors du chargement des données initiales');
      }
    });
  }

  ngAfterViewInit(): void {
    // Moved data loading to ngOnInit via loadInitialData()
  }

  updateArticle(article: Article): void {
    this.articleService.Put(article.id, article).subscribe({
      next: (response) => {
        this.toastr.success('Article mis à jour avec succès');
        if (this.dialogRef) {
          this.dialogRef.close(true);
        }
      },
      error: (error) => {
        this.toastr.error('Erreur lors de la mise à jour');
        console.error(error);
      }
    });
  }

  createForm() {
    this.articleForm = this.fb.group({
      articlecode: ['', Validators.required],
      description: ['', Validators.required],
      selectedCategory: ['', Validators.required],
      selectedSubCategory: ['', Validators.required],
      selectedThikness: [null],
      selectedWidth: [null],
      selectedLengths: [''],
      selectedPriceTTC: ['', Validators.required],
      selectedTva: ['', Validators.required],
      calculatedPriceHT: [{ value: '' }],
      quantityUnit: ['', Validators.required],
      minquantity: [0, [Validators.required, Validators.min(0)]],
      profitpercentage: [0, [Validators.required, percentageValidator()]],
      imageurl: [null]
    });

    // Call the method whenever 'selectedPriceTTC' or 'selectedTva' changes
    this.articleForm.valueChanges.subscribe(() => {
      this.CalculatePriceTTC_HT();
    });

    // Strip '%' from profitpercentage if present
    this.profitControl?.valueChanges.subscribe(value => {
      if (value && typeof value === 'string' && value.includes('%')) {
        const cleanedValue = value.replace(/%/g, '').trim();
        this.profitControl?.setValue(cleanedValue, { emitEvent: false });
      }
    });
  }

  get f() { return this.articleForm.controls; }
  get profitControl() { return this.articleForm.get('profitpercentage'); }

  isLengthSelected(length: string): boolean {
    return this.selectedLengthNames.includes(length);
  }

  onLengthSelectionChange(event: any, length: string): void {
    const isChecked = event.checked;

    if (isChecked) {
      if (!this.selectedLengthNames.includes(length)) {
        this.selectedLengthNames.push(length);
      }
    } else {
      this.selectedLengthNames = this.selectedLengthNames.filter(item => item !== length);
    }

    // Sort length names numerically for consistency
    this.selectedLengthNames.sort((a, b) => parseFloat(a) - parseFloat(b));

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

  onImageSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        this.articleForm.get('imageurl')?.setValue(base64String);
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(): void {
    this.articleForm.get('imageurl')?.setValue(null);
  }

  onCategoryChange(categoryId: number, patchSubCategory?: number | null) {
    const selectedCategory = this.categories.find(category => category.id === categoryId);
    this.filteredSubCategories = selectedCategory ? selectedCategory.firstchildren : [];
    console.log("SELECTED CATEGORY = ", selectedCategory);
    this.woodId = selectedCategory?.id || 0;

    // Only reset if we're not patching
    if (patchSubCategory === undefined) {
      this.articleForm.get('selectedSubCategory')?.setValue(null);
    } else if (patchSubCategory) {
      this.articleForm.get('selectedSubCategory')?.setValue(patchSubCategory);
    }

    // Specific logic for Wood (Category ID 1)
    if (this.woodId === 1) {
      this.articleForm.get('quantityUnit')?.setValue(QuantityUnits.m3);
      this.articleForm.get('quantityUnit')?.disable();
    } else {
      this.articleForm.get('quantityUnit')?.enable();
      this.quantityUnits = Object.values(QuantityUnits).filter(unit => unit !== QuantityUnits.m3);
    }
  }

  patchForm() {
    const article = this.data.article;
    this.woodId = article.category?.id || article.categoryid || 0;

    // Use current quantity units
    this.quantityUnits = Object.values(QuantityUnits);

    this.articleForm.patchValue({
      articlecode: article.reference,
      description: article.description,
      selectedCategory: this.woodId,
      selectedThikness: article.thickness?.id || article.thicknessid,
      selectedWidth: article.width?.id || article.widthid,
      selectedPriceTTC: article.sellprice_ttc,
      selectedTva: article.tvaid,
      calculatedPriceHT: article.sellprice_ht,
      quantityUnit: Object.values(QuantityUnits).find(unit => {
        const articleUnit = article.unit?.substring(0, 3).toLowerCase();
        return unit.toLowerCase().startsWith(articleUnit || '');
      }),
      minquantity: article.minquantity,
      profitpercentage: article.profitmarginpercentage,
      imageurl: article.imageurl
    }, { emitEvent: false });

    if (article.iswood) {
      this.initializeLengths(article);
    }

    // Call onCategoryChange to populate subcategories and then patch the subcategory value
    this.onCategoryChange(this.woodId, article.subcategory?.id || article.subcategoryid);
  }

  initializeLengths(article: Article): void {
    if (article.lengths && typeof article.lengths === 'string') {
      this.selectedLengthNames = article.lengths
        .replace('[', '')
        .replace(']', '')
        .split(',')
        .map((length: string) => length.trim());
    } else {
      this.selectedLengthNames = [];
    }
    this.selectedLengths = article.lengths || '';
  }



  onSubmit() {
    if (this.articleForm.valid) {
      const article = new Article();
      const formValues = this.articleForm.getRawValue(); // Use getRawValue to include disabled fields if needed

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
      
      // Clean up profitpercentage to be a number (strip '%' if user bypassed the listener somehow)
      const rawProfit = formValues.profitpercentage?.toString().replace(/%/g, '').trim();
      article.profitmarginpercentage = parseFloat(rawProfit) || 0;

      article.unit = this.articleForm.get('quantityUnit')?.value.substring(0, 3);

      // console.log("Article unit set to: ", article.unit);
      article.lengths = this.selectedLengths || null;
      article.lastpurchaseprice_ttc = 0;

      // Map related entities (category, thickness, width, tva)
      article.categoryid = formValues.selectedCategory || 0;
      article.subcategoryid = formValues.selectedSubCategory || 0;
      article.thicknessid = formValues.selectedThikness || null;
      article.widthid = formValues.selectedWidth || null;
      article.tvaid = formValues.selectedTva || 0;
      article.imageurl = formValues.imageurl || null;

      // Set related entities to null for now
      article.category = null;
      article.subcategory = null;
      article.thickness = null;
      article.width = null;
      article.tva = null;

      // Determine if it's a wood product
      article.iswood = this.woodId === 1;

      if (this.isEditMode) {
        article.id = this.data.article.id;
        this.updateArticle(article);
      } else {
        this.addArticle(article);
      }
    } else {
      this.articleForm.markAllAsTouched();
      this.toastr.warning("Veuillez corriger les erreurs dans le formulaire !");
    }
  }

  addArticle(article: Article): void {
    if (article) {
      console.log("ARTICLE TO SEND : ", article);
      this.articleService.AddArticle(article).subscribe({
        next: (response) => {
          this.toastr.success('Article ajouté avec succès: ' + response.reference);
          if (this.dialogRef) {
            this.dialogRef.close(true);
          } else {
            this.router.navigateByUrl('home/articles');
          }
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

}

