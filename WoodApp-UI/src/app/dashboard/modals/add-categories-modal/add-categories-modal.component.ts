import { Component, inject, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { ERROR_ADD_CATEGORY, MAT_DIALOG_TITLE_MODAL, MAT_LABEL_DESIGNATION as MAT_LABEL_DESCRIPTION, MAT_LABEL_REFRENCE, SUCCESS_ADD_CATEGORY, WARNING_ADD_CATEGORY } from '../../../shared/constants/modals/categories_modal';
import { ADD_UNDER_CATEGORY_BUTTON, REGISTER_BUTTON, ABORT_BUTTON } from '../../../shared/Text_Buttons';
import { ToastrService } from 'ngx-toastr';
import { CategoryService } from '../../../services/configuration/category.service';
import { Category, SubCategory } from '../../../models/configuration/category';
import { Store } from '@ngrx/store';
import { addCategory } from '../../../store/actions/category.actions';
import { AuthenticationService } from '../../../services/components/authentication.service';

@Component({
  selector: 'app-add-categories-modal',
  templateUrl: './add-categories-modal.component.html',
  styleUrls: ['./add-categories-modal.component.css']
})
export class AddCategoriesModalComponent implements OnInit {

  //fb1 = inject(FormBuilder);
  authService = inject(AuthenticationService);

  //#region Label & Constants
  mat_dialog_title_modal: string = MAT_DIALOG_TITLE_MODAL;
  mat_label_reference: string = MAT_LABEL_REFRENCE;
  mat_label_description: string = MAT_LABEL_DESCRIPTION;

  add_under_category_button: string = ADD_UNDER_CATEGORY_BUTTON;
  register_button: string = REGISTER_BUTTON;
  abort_button: string = ABORT_BUTTON;
  //#endregion

  //#region Output Messages
  success_add_category: string = SUCCESS_ADD_CATEGORY;
  error_add_category: string = ERROR_ADD_CATEGORY;
  warning_add_category: string = WARNING_ADD_CATEGORY;
  //#endregion



  categoryForm: FormGroup;
  category!: Category;
  categories!: Category[];

  constructor(
    public dialogRef: MatDialogRef<AddCategoriesModalComponent>,
    private fb: FormBuilder,
    private toastr: ToastrService,
    private store: Store,
    private categoryService: CategoryService
  ) {
    this.categoryForm = this.fb.group({
      reference: ['', Validators.required],
      description: ['', Validators.required],
      subcategories: this.fb.array([])
    });
  }

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      this.categoryForm = this.fb.group({
        reference: ['', Validators.required],
        description: ['', Validators.required],
        subcategories: this.fb.array([])
      });
    }

  }

  get subcategories(): FormArray {
    return this.categoryForm.get('subcategories') as FormArray;
  }

  addSubcategory(): void {
    const subcategoryForm = this.fb.group({
      subReference: ['', Validators.required],
      subDescription: ['', Validators.required]
    });
    this.subcategories.push(subcategoryForm);
  }

  removeSubcategory(index: number): void {
    this.subcategories.removeAt(index);
  }

  onNoClick(): void {
    this.dialogRef.close();

  }

  /**
   * Enregistrer la categorie avec la/les sous-categorie(s)
   */
  onSubmit(): void {
    const _appUSerId = Number(this.authService.getUserDetail()?.id);
    if (this.categoryForm.valid) {
      const formValues = this.categoryForm.value;
      const cat = new Category();
      cat.reference = formValues.reference;
      cat.description = formValues.description;
      cat.firstchildren = formValues.subcategories.map((sc: any) => ({
        id: 0, // Assuming the ID will be set by the backend
        reference: sc.subReference,
        description: sc.subDescription,
        creationdate: new Date(),
        updatedate: new Date(),
        isdeleted: false,
        updatedby: _appUSerId,
        idparent: 0
      }));

      this.addCategory(cat);
    } else {
      this.toastr.warning(this.warning_add_category);
    }
  }


  addCategory(cat: Category): void {
    if (cat) {
      this.categoryService.AddCategory(cat).subscribe({
        next: (response) => {
          this.toastr.success(this.success_add_category);
          this.dialogRef.close(response);
        },
        error: (error) => {
          console.error('Error adding category', error);
          this.toastr.error(this.error_add_category);
        }
      });
    } else {
      this.toastr.warning(this.warning_add_category);
    }   
  }

  // addCategory(cat: Category): void {
  //   if (cat) {
  //     this.store.dispatch(addCategory({ category: cat }));
  //     this.dialogRef.close(cat);
  //   } else {
  //     this.toastr.warning(this.warning_add_category);
  //   }
  // }


}
